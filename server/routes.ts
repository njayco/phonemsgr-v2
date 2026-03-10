import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { hashPassword, comparePasswords } from "./auth";
import { registerSchema, loginSchema } from "@shared/schema";
import { setupWebSocket } from "./websocket";
import { seedDatabase } from "./seed";

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
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
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
    await storage.markMessagesRead(req.params.id, userId);
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
    const inThread = await storage.isUserInThread(userId, req.params.id);
    if (!inThread) {
      return res.status(403).json({ message: "Not a participant of this thread" });
    }
    const { text, isMesh } = req.body;
    if (!text) {
      return res.status(400).json({ message: "text required" });
    }
    const msg = await storage.createMessage(
      req.params.id,
      userId,
      text,
      isMesh || false,
    );
    broadcastToThread(req.params.id, userId, msg);
    return res.json(msg);
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
    // TODO: rate limiting for kindness abuse prevention
    await storage.awardKindnessForLike(req.params.id, userId);
    return res.json({ success: true });
  });

  app.post("/api/feed/:id/comment", requireAuth, async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: "text required" });
    }
    await storage.commentOnPost(req.params.id, req.session.userId!, text);
    const comments = await storage.getPostComments(req.params.id);
    return res.json({ success: true, comment: comments[0] });
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
      await storage.awardPostKindness(req.params.id, req.session.userId!, delta);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/feed/comments/:id/kindness", requireAuth, async (req, res) => {
    try {
      const { delta } = req.body;
      if (delta !== 10 && delta !== -10) {
        return res.status(400).json({ message: "delta must be 10 or -10" });
      }
      await storage.awardCommentKindness(req.params.id, req.session.userId!, delta);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/kindness/history", requireAuth, async (req, res) => {
    const history = await storage.getKindnessHistory(req.session.userId!);
    return res.json(history);
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

  const broadcast = setupWebSocket(httpServer);

  async function broadcastToThread(threadId: string, senderId: string, message: any) {
    const participantIds = await storage.getThreadParticipantIds(threadId);
    const recipientIds = participantIds.filter((id) => id !== senderId);
    broadcast(threadId, senderId, message, recipientIds);
  }

  return httpServer;
}
