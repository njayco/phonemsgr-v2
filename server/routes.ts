import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { hashPassword, comparePasswords } from "./auth";
import { registerSchema, loginSchema } from "@shared/schema";
import { setupWebSocket, broadcastToUser, isUserOnlineWs } from "./websocket";
import { seedDatabase } from "./seed";
import { sendPushToUser } from "./push";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const PgStore = connectPgSimple(session);

  const isProduction = process.env.NODE_ENV === "production";
  app.use(
    session({
      store: new PgStore({
        pool: pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "phone-msgr-secret-key-2026",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" as const : "lax" as const,
      },
    }),
  );

  await seedDatabase();

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
      }

      const { username, password, displayName, phone } = parsed.data;

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        displayName,
        phone: phone || "",
      });

      req.session.userId = user.id;

      const interests = await storage.getUserInterests(user.id);
      const badges = await storage.getUserBadges(user.id);

      const { password: _, ...safeUser } = user;
      return res.status(201).json({ ...safeUser, interests, badges });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const { username, password } = parsed.data;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const valid = await comparePasswords(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      await storage.updateUser(user.id, { isOnline: true });
      req.session.userId = user.id;

      const interests = await storage.getUserInterests(user.id);
      const badges = await storage.getUserBadges(user.id);

      const { password: _, ...safeUser } = user;
      return res.json({ ...safeUser, interests, badges, isOnline: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (req.session.userId) {
      await storage.updateUser(req.session.userId, { isOnline: false });
    }
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isOnline) {
      await storage.setUserOnline(req.session.userId, true);
    }

    const interests = await storage.getUserInterests(user.id);
    const badges = await storage.getUserBadges(user.id);

    const { password: _, ...safeUser } = user;
    return res.json({ ...safeUser, interests, badges, isOnline: true });
  });

  app.get("/api/profile/:id", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const interests = await storage.getUserInterests(user.id);
    const badges = await storage.getUserBadges(user.id);
    const { password: _, ...safeUser } = user;
    return res.json({ ...safeUser, interests, badges });
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const allowedFields = ["displayName", "avatarUrl", "phone", "inboxPrice"];
    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    const user = await storage.updateUser(userId, updates);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.get("/api/threads", requireAuth, async (req, res) => {
    const threads = await storage.getThreadsForUser(req.session.userId!);
    return res.json(threads);
  });

  app.get("/api/threads/:id/messages", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const inThread = await storage.isUserInThread(userId, req.params.id);
    if (!inThread) {
      return res.status(403).json({ message: "Not a participant of this thread" });
    }
    const msgs = await storage.getMessages(req.params.id);
    const senderIds = await storage.markMessagesRead(req.params.id, userId);
    for (const senderId of senderIds) {
      broadcastToUser(senderId, {
        type: "messages_read",
        threadId: req.params.id,
        readByUserId: userId,
      });
    }
    return res.json(msgs.reverse());
  });

  app.post("/api/threads", requireAuth, async (req, res) => {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ message: "participantId required" });
    }
    const threadId = await storage.getOrCreateThread(req.session.userId!, participantId);
    return res.json({ threadId });
  });

  app.post("/api/threads/:id/messages", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const threadId = req.params.id;
    const inThread = await storage.isUserInThread(userId, threadId);
    if (!inThread) {
      return res.status(403).json({ message: "Not a participant of this thread" });
    }
    const { text, isMesh } = req.body;
    if (!text) {
      return res.status(400).json({ message: "text required" });
    }
    const msg = await storage.createMessage(threadId, userId, text, isMesh || false);

    const participantIds = await storage.getThreadParticipantIds(threadId);
    const recipientIds = participantIds.filter((id) => id !== userId);

    const msgPayload = {
      ...msg,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
      status: "sent",
    };

    for (const recipientId of recipientIds) {
      broadcastToUser(recipientId, {
        type: "new_message",
        threadId,
        message: msgPayload,
      });

      const sender = await storage.getUser(userId);
      const senderName = sender?.displayName || sender?.username || "Someone";

      if (isUserOnlineWs(recipientId)) {
        await storage.markMessageDelivered(msg.id);
        broadcastToUser(userId, {
          type: "message_delivered",
          threadId,
          messageId: msg.id,
        });
        msgPayload.status = "delivered";
      } else {
        sendPushToUser(recipientId, senderName, text, {
          type: "new_message",
          threadId,
        }).catch(() => {});
      }

      const notif = await storage.createNotification(
        recipientId,
        "new_message",
        "New Message",
        `${senderName}: ${text.length > 50 ? text.slice(0, 50) + '...' : text}`,
        threadId,
        userId,
      );
      broadcastToUser(recipientId, { type: "new_notification", notification: notif });
    }

    return res.json(msgPayload);
  });

  app.delete("/api/threads/:threadId/messages/:messageId", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const { threadId, messageId } = req.params;

    const inThread = await storage.isUserInThread(userId, threadId);
    if (!inThread) {
      return res.status(403).json({ message: "Not a participant of this thread" });
    }

    const deleted = await storage.deleteMessage(messageId, userId, threadId);
    if (!deleted) {
      return res.status(403).json({ message: "Cannot delete this message" });
    }

    const participantIds = await storage.getThreadParticipantIds(threadId);
    for (const pid of participantIds) {
      broadcastToUser(pid, {
        type: "message_deleted",
        threadId,
        messageId,
      });
    }

    return res.json({ success: true });
  });

  app.get("/api/users/search", requireAuth, async (req, res) => {
    const q = (req.query.q as string) || "";
    if (q.trim().length === 0) {
      return res.json([]);
    }
    const results = await storage.searchUsers(q, req.session.userId!);
    return res.json(results);
  });

  app.post("/api/buddies/:id", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const buddyId = req.params.id;
    if (userId === buddyId) {
      return res.status(400).json({ message: "Cannot add yourself" });
    }
    await storage.addBuddy(userId, buddyId);
    return res.json({ success: true });
  });

  app.delete("/api/buddies/:id", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const buddyId = req.params.id;
    await storage.removeBuddy(userId, buddyId);
    return res.json({ success: true });
  });

  app.get("/api/buddies", requireAuth, async (req, res) => {
    const buddyIds = await storage.getBuddyIds(req.session.userId!);
    return res.json(buddyIds);
  });

  app.get("/api/feed", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const type = req.query.type as string;

    if (type === "buddy") {
      const buddyIds = await storage.getBuddyIds(userId);
      const posts = await storage.getBuddyFeedPosts(userId, buddyIds);
      return res.json(posts);
    }

    if (type === "nearby") {
      const nearbyUsers = await storage.getNearbyUsers(userId, 400);
      const nearbyIds = nearbyUsers.map((u: any) => u.id);
      nearbyIds.push(userId);
      const posts = await storage.getNearbyFeedPosts(nearbyIds);
      return res.json(posts);
    }

    const posts = await storage.getFeedPosts();
    return res.json(posts);
  });

  app.post("/api/feed", requireAuth, async (req, res) => {
    const { content, mediaType, mediaUrl, audience } = req.body;
    const post = await storage.createFeedPost(
      req.session.userId!,
      content || "",
      mediaType || "text",
      mediaUrl,
      audience,
    );
    return res.status(201).json(post);
  });

  app.post("/api/feed/:id/like", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    await storage.likePost(req.params.id, userId);
    await storage.awardKindnessForLike(req.params.id, userId);
    return res.json({ success: true });
  });

  app.post("/api/feed/:id/comment", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const postId = req.params.id;
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: "text required" });
    }
    await storage.commentOnPost(postId, userId, text);
    const comments = await storage.getPostComments(postId);
    const newComment = comments[0];

    const postOwner = await storage.getPostOwner(postId);
    if (postOwner && postOwner !== userId) {
      const commenter = await storage.getUser(userId);
      const notif = await storage.createNotification(
        postOwner,
        "new_comment",
        "New Comment",
        `${commenter?.displayName || commenter?.username || "Someone"} commented on your post`,
        postId,
        userId,
      );
      broadcastToUser(postOwner, { type: "new_comment", postId, comment: newComment });
      broadcastToUser(postOwner, { type: "new_notification", notification: notif });
      sendPushToUser(
        postOwner,
        "New Comment",
        `${commenter?.displayName || "Someone"} commented on your post`,
        { type: "new_comment", postId },
      ).catch(() => {});
    }

    return res.json({ success: true, comment: newComment });
  });

  app.get("/api/feed/:id/comments", requireAuth, async (req, res) => {
    const comments = await storage.getPostComments(req.params.id);
    return res.json(comments);
  });

  app.post("/api/feed/:id/kindness", requireAuth, async (req, res) => {
    try {
      const { delta } = req.body;
      if (delta !== 10 && delta !== -10) {
        return res.status(400).json({ message: "delta must be 10 or -10" });
      }
      const userId = req.session.userId!;
      const postId = req.params.id;
      const userDelta = await storage.awardPostKindness(postId, userId, delta);

      const postOwner = await storage.getPostOwner(postId);
      if (postOwner) {
        const post = await storage.getUser(postOwner);
        const actor = await storage.getUser(userId);
        const newScore = post?.kindnessScore || 0;

        broadcastToUser(postOwner, {
          type: "kindness_awarded",
          postId,
          delta,
          newKindnessScore: newScore,
          actorUsername: actor?.username || "Someone",
        });

        const notif = await storage.createNotification(
          postOwner,
          "kindness_award",
          delta > 0 ? "Kindness Received!" : "Kindness Deducted",
          `${actor?.displayName || "Someone"} ${delta > 0 ? "awarded" : "deducted"} ${Math.abs(delta)} kindness on your post`,
          postId,
          userId,
        );
        broadcastToUser(postOwner, { type: "new_notification", notification: notif });
        sendPushToUser(
          postOwner,
          delta > 0 ? "Kindness Received! +" + delta : "Kindness Deducted " + delta,
          `${actor?.displayName || "Someone"} ${delta > 0 ? "awarded" : "deducted"} ${Math.abs(delta)} kindness on your post`,
          { type: "kindness_award", postId },
        ).catch(() => {});
      }

      return res.json({ success: true, delta, userDelta });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/feed/:id/my-kindness", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const delta = await storage.getUserKindnessDelta(userId, "post", req.params.id);
    return res.json({ delta });
  });

  app.post("/api/feed/comments/:id/kindness", requireAuth, async (req, res) => {
    try {
      const { delta } = req.body;
      if (delta !== 10 && delta !== -10) {
        return res.status(400).json({ message: "delta must be 10 or -10" });
      }
      const userId = req.session.userId!;
      const commentId = req.params.id;
      const userDelta = await storage.awardCommentKindness(commentId, userId, delta);

      const commentInfo = await storage.getCommentOwnerAndPost(commentId);
      if (commentInfo) {
        const actor = await storage.getUser(userId);
        const notif = await storage.createNotification(
          commentInfo.userId,
          "kindness_award",
          delta > 0 ? "Kindness Received!" : "Kindness Deducted",
          `${actor?.displayName || "Someone"} ${delta > 0 ? "awarded" : "deducted"} ${Math.abs(delta)} kindness on your comment`,
          commentInfo.postId,
          userId,
        );
        broadcastToUser(commentInfo.userId, { type: "new_notification", notification: notif });
        sendPushToUser(
          commentInfo.userId,
          delta > 0 ? "Kindness Received!" : "Kindness Deducted",
          `${actor?.displayName || "Someone"} ${delta > 0 ? "awarded" : "deducted"} ${Math.abs(delta)} kindness on your comment`,
          { type: "kindness_award", postId: commentInfo.postId },
        ).catch(() => {});
      }

      return res.json({ success: true, delta, userDelta });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/feed/comments/:id/my-kindness", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const delta = await storage.getUserKindnessDelta(userId, "comment", req.params.id);
    return res.json({ delta });
  });

  app.get("/api/kindness/history", requireAuth, async (req, res) => {
    const history = await storage.getKindnessHistory(req.session.userId!);
    return res.json(history);
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifs = await storage.getNotifications(req.session.userId!);
    return res.json(notifs);
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(req.params.id, req.session.userId!);
    return res.json({ success: true });
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    const count = await storage.getUnreadNotificationCount(req.session.userId!);
    return res.json({ count });
  });

  app.post("/api/push-token", requireAuth, async (req, res) => {
    const { token } = req.body;
    await storage.updatePushToken(req.session.userId!, token || null);
    return res.json({ success: true });
  });

  app.get("/api/nearby", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const type = req.query.type as string;
    const radius = parseInt(req.query.radius as string) || 400;

    if (type === "buddy") {
      const nearby = await storage.getNearbyBuddies(userId, radius);
      return res.json(nearby);
    }

    if (type === "nearby") {
      const nearby = await storage.getNearbyNonBuddies(userId, radius);
      return res.json(nearby);
    }

    const nearby = await storage.getNearbyUsers(userId, radius);
    return res.json(nearby);
  });

  app.post("/api/nearby/update", requireAuth, async (req, res) => {
    const { latitude, longitude } = req.body;
    await storage.updatePresence(
      req.session.userId!,
      latitude || 40.7128,
      longitude || -74.006,
    );
    return res.json({ success: true });
  });

  app.get("/api/settings", requireAuth, async (req, res) => {
    const settings = await storage.getUserSettings(req.session.userId!);
    return res.json(
      settings || {
        ghostMode: false,
        interestDiscovery: true,
        mutualFiltering: true,
        seeEveryone: false,
        notificationsEnabled: true,
      },
    );
  });

  app.patch("/api/settings", requireAuth, async (req, res) => {
    const allowedFields = ["ghostMode", "interestDiscovery", "mutualFiltering", "seeEveryone", "notificationsEnabled"];
    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    await storage.updateUserSettings(req.session.userId!, updates);
    const settings = await storage.getUserSettings(req.session.userId!);
    return res.json(settings);
  });

  app.get("/api/monetization", requireAuth, async (req, res) => {
    const settings = await storage.getMonetizationSettings(req.session.userId!);
    return res.json(
      settings || {
        inboxPriceEnabled: false,
        inboxPrice: 0,
        eventHostingEnabled: false,
      },
    );
  });

  app.patch("/api/monetization", requireAuth, async (req, res) => {
    const allowedFields = ["inboxPriceEnabled", "inboxPrice", "eventHostingEnabled"];
    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    await storage.updateMonetizationSettings(req.session.userId!, updates);
    const settings = await storage.getMonetizationSettings(req.session.userId!);
    return res.json(settings);
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  return httpServer;
}
