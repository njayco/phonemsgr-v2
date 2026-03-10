import {
  type User,
  type InsertUser,
  type Message,
  type FeedPost,
  type FeedComment,
  type KindnessEntry,
  type UserSettings,
  type MonetizationSettings,
  users,
  userInterests,
  userBadges,
  messageThreads,
  threadParticipants,
  messages,
  feedPosts,
  feedComments,
  feedReactions,
  kindnessLedger,
  kindnessActions,
  buddyConnections,
  nearbyPresence,
  events,
  monetizationSettings,
  userSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ne, inArray, or, ilike } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  getUserInterests(userId: string): Promise<string[]>;
  setUserInterests(userId: string, interests: string[]): Promise<void>;
  getUserBadges(userId: string): Promise<string[]>;

  getThreadsForUser(userId: string): Promise<any[]>;
  getOrCreateThread(userId: string, participantId: string): Promise<string>;

  getMessages(threadId: string, limit?: number): Promise<Message[]>;
  createMessage(threadId: string, senderId: string, text: string, isMesh?: boolean): Promise<Message>;
  markMessagesRead(threadId: string, userId: string): Promise<void>;

  getFeedPosts(limit?: number): Promise<any[]>;
  createFeedPost(userId: string, content: string, mediaType: string, mediaUrl?: string, audience?: string): Promise<FeedPost>;
  likePost(postId: string, userId: string): Promise<void>;
  commentOnPost(postId: string, userId: string, text: string): Promise<void>;

  addKindnessPoints(userId: string, points: number, description: string): Promise<void>;
  getKindnessHistory(userId: string, limit?: number): Promise<KindnessEntry[]>;

  getNearbyUsers(userId: string, radiusMeters?: number): Promise<any[]>;
  updatePresence(userId: string, lat: number, lng: number): Promise<void>;

  getUserSettings(userId: string): Promise<UserSettings | null>;
  updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<void>;

  getMonetizationSettings(userId: string): Promise<MonetizationSettings | null>;
  updateMonetizationSettings(userId: string, updates: Partial<MonetizationSettings>): Promise<void>;

  isUserInThread(userId: string, threadId: string): Promise<boolean>;
  getThreadParticipantIds(threadId: string): Promise<string[]>;

  searchUsers(query: string, currentUserId: string): Promise<any[]>;
  getBuddyIds(userId: string): Promise<string[]>;
  addBuddy(userId: string, buddyId: string): Promise<void>;
  removeBuddy(userId: string, buddyId: string): Promise<void>;
  getBuddyFeedPosts(userId: string, buddyIds: string[]): Promise<any[]>;
  getNearbyFeedPosts(nearbyUserIds: string[]): Promise<any[]>;
  getNearbyBuddies(userId: string, radiusMeters: number): Promise<any[]>;
  getNearbyNonBuddies(userId: string, radiusMeters: number): Promise<any[]>;
  setUserOnline(userId: string, online: boolean): Promise<void>;

  getPostComments(postId: string): Promise<any[]>;
  awardKindnessForLike(postId: string, likerId: string): Promise<void>;
  awardPostKindness(postId: string, actorUserId: string, delta: number): Promise<void>;
  awardCommentKindness(commentId: string, actorUserId: string, delta: number): Promise<void>;
  getPostOwner(postId: string): Promise<string | null>;
  getCommentOwnerAndPost(commentId: string): Promise<{ userId: string; postId: string } | null>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserInterests(userId: string): Promise<string[]> {
    const rows = await db
      .select({ interest: userInterests.interest })
      .from(userInterests)
      .where(eq(userInterests.userId, userId));
    return rows.map((r) => r.interest);
  }

  async setUserInterests(userId: string, interests: string[]): Promise<void> {
    await db.delete(userInterests).where(eq(userInterests.userId, userId));
    if (interests.length > 0) {
      await db.insert(userInterests).values(
        interests.map((interest) => ({ userId, interest })),
      );
    }
  }

  async getUserBadges(userId: string): Promise<string[]> {
    const rows = await db
      .select({ badgeName: userBadges.badgeName })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    return rows.map((r) => r.badgeName);
  }

  async getThreadsForUser(userId: string): Promise<any[]> {
    const participantRows = await db
      .select()
      .from(threadParticipants)
      .where(eq(threadParticipants.userId, userId));

    if (participantRows.length === 0) return [];

    const threadIds = participantRows.map((p) => p.threadId);

    const threads = await db
      .select()
      .from(messageThreads)
      .where(inArray(messageThreads.id, threadIds))
      .orderBy(desc(messageThreads.updatedAt));

    const result = [];
    for (const thread of threads) {
      const otherParticipants = await db
        .select()
        .from(threadParticipants)
        .innerJoin(users, eq(threadParticipants.userId, users.id))
        .where(
          and(
            eq(threadParticipants.threadId, thread.id),
            ne(threadParticipants.userId, userId),
          ),
        );

      const myParticipant = participantRows.find((p) => p.threadId === thread.id);

      const lastMsgRows = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, thread.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const lastMsg = lastMsgRows[0];
      const other = otherParticipants[0];

      result.push({
        id: thread.id,
        participantId: other?.users?.id || "",
        participantName: other?.users?.displayName || "Unknown",
        participantAvatar: other?.users?.avatarUrl || "",
        lastMessage: lastMsg?.text || "",
        lastMessageTime: lastMsg?.createdAt?.getTime() || thread.createdAt.getTime(),
        unreadCount: myParticipant?.unreadCount || 0,
        isOnline: other?.users?.isOnline || false,
        isEncrypted: thread.isEncrypted,
      });
    }

    return result;
  }

  async getOrCreateThread(userId: string, participantId: string): Promise<string> {
    const myThreads = await db
      .select({ threadId: threadParticipants.threadId })
      .from(threadParticipants)
      .where(eq(threadParticipants.userId, userId));

    if (myThreads.length > 0) {
      const threadIds = myThreads.map((t) => t.threadId);
      const matching = await db
        .select({ threadId: threadParticipants.threadId })
        .from(threadParticipants)
        .where(
          and(
            inArray(threadParticipants.threadId, threadIds),
            eq(threadParticipants.userId, participantId),
          ),
        );

      if (matching.length > 0) {
        return matching[0].threadId;
      }
    }

    const [thread] = await db.insert(messageThreads).values({}).returning();

    await db.insert(threadParticipants).values([
      { threadId: thread.id, userId },
      { threadId: thread.id, userId: participantId },
    ]);

    return thread.id;
  }

  async getMessages(threadId: string, limit = 50): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async createMessage(
    threadId: string,
    senderId: string,
    text: string,
    isMesh = false,
  ): Promise<Message> {
    const [msg] = await db
      .insert(messages)
      .values({
        threadId,
        senderId,
        text,
        isDeliveredViaMesh: isMesh,
      })
      .returning();

    await db
      .update(messageThreads)
      .set({ updatedAt: new Date() })
      .where(eq(messageThreads.id, threadId));

    await db
      .update(threadParticipants)
      .set({ unreadCount: sql`${threadParticipants.unreadCount} + 1` })
      .where(
        and(
          eq(threadParticipants.threadId, threadId),
          ne(threadParticipants.userId, senderId),
        ),
      );

    return msg;
  }

  async markMessagesRead(threadId: string, userId: string): Promise<void> {
    await db
      .update(threadParticipants)
      .set({ unreadCount: 0, lastReadAt: new Date() })
      .where(
        and(
          eq(threadParticipants.threadId, threadId),
          eq(threadParticipants.userId, userId),
        ),
      );
  }

  async getFeedPosts(limit = 20): Promise<any[]> {
    const posts = await db
      .select({
        id: feedPosts.id,
        userId: feedPosts.userId,
        username: users.username,
        avatar: users.avatarUrl,
        content: feedPosts.content,
        mediaType: feedPosts.mediaType,
        mediaUrl: feedPosts.mediaUrl,
        kindnessEarned: feedPosts.kindnessEarned,
        likesCount: feedPosts.likesCount,
        commentsCount: feedPosts.commentsCount,
        createdAt: feedPosts.createdAt,
      })
      .from(feedPosts)
      .innerJoin(users, eq(feedPosts.userId, users.id))
      .orderBy(desc(feedPosts.createdAt))
      .limit(limit);

    return posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      content: p.content,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl,
      timestamp: p.createdAt.getTime(),
      kindnessEarned: p.kindnessEarned,
      likes: p.likesCount,
      comments: p.commentsCount,
    }));
  }

  async createFeedPost(
    userId: string,
    content: string,
    mediaType: string,
    mediaUrl?: string,
    audience?: string,
  ): Promise<FeedPost> {
    const [post] = await db
      .insert(feedPosts)
      .values({ userId, content, mediaType, mediaUrl, audience: audience || "everyone" })
      .returning();
    return post;
  }

  async likePost(postId: string, userId: string): Promise<void> {
    try {
      await db.insert(feedReactions).values({ postId, userId, type: "like" });
      await db
        .update(feedPosts)
        .set({ likesCount: sql`${feedPosts.likesCount} + 1` })
        .where(eq(feedPosts.id, postId));
    } catch {
      // already liked — ignore unique constraint
    }
  }

  async commentOnPost(postId: string, userId: string, text: string): Promise<void> {
    await db.insert(feedComments).values({ postId, userId, text });
    await db
      .update(feedPosts)
      .set({ commentsCount: sql`${feedPosts.commentsCount} + 1` })
      .where(eq(feedPosts.id, postId));
  }

  async addKindnessPoints(userId: string, points: number, description: string): Promise<void> {
    await db.insert(kindnessLedger).values({ userId, points, description });
    await db
      .update(users)
      .set({ kindnessScore: sql`${users.kindnessScore} + ${points}` })
      .where(eq(users.id, userId));
  }

  async getKindnessHistory(userId: string, limit = 20): Promise<KindnessEntry[]> {
    return db
      .select()
      .from(kindnessLedger)
      .where(eq(kindnessLedger.userId, userId))
      .orderBy(desc(kindnessLedger.createdAt))
      .limit(limit);
  }

  async getNearbyUsers(userId: string, radiusMeters = 500): Promise<any[]> {
    const allPresence = await db
      .select({
        usrId: nearbyPresence.userId,
        latitude: nearbyPresence.latitude,
        longitude: nearbyPresence.longitude,
        lastSeen: nearbyPresence.lastSeen,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatarUrl,
        kindnessScore: users.kindnessScore,
        isOnline: users.isOnline,
      })
      .from(nearbyPresence)
      .innerJoin(users, eq(nearbyPresence.userId, users.id))
      .where(ne(nearbyPresence.userId, userId));

    const myPresence = await db
      .select()
      .from(nearbyPresence)
      .where(eq(nearbyPresence.userId, userId));

    const myLat = myPresence[0]?.latitude || 0;
    const myLng = myPresence[0]?.longitude || 0;

    const withDistance = allPresence.map((p) => {
      const distance = Math.round(
        Math.sqrt(Math.pow((p.latitude - myLat) * 111000, 2) + Math.pow((p.longitude - myLng) * 111000, 2)),
      );
      const angle = Math.round(
        (Math.atan2(p.longitude - myLng, p.latitude - myLat) * 180) / Math.PI,
      );
      return {
        id: p.usrId,
        username: p.username,
        displayName: p.displayName,
        avatar: p.avatar || "",
        distance: Math.max(50, Math.min(distance, radiusMeters)),
        rawDistance: distance,
        interests: [],
        angle: ((angle % 360) + 360) % 360,
        kindnessScore: p.kindnessScore,
        isOnline: p.isOnline,
      };
    });

    return withDistance.filter((u) => u.rawDistance <= radiusMeters);
  }

  async updatePresence(userId: string, lat: number, lng: number): Promise<void> {
    await db
      .insert(nearbyPresence)
      .values({ userId, latitude: lat, longitude: lng, lastSeen: new Date() })
      .onConflictDoUpdate({
        target: nearbyPresence.userId,
        set: { latitude: lat, longitude: lng, lastSeen: new Date() },
      });
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings || null;
  }

  async isUserInThread(userId: string, threadId: string): Promise<boolean> {
    const [row] = await db
      .select({ threadId: threadParticipants.threadId })
      .from(threadParticipants)
      .where(
        and(
          eq(threadParticipants.threadId, threadId),
          eq(threadParticipants.userId, userId),
        ),
      );
    return !!row;
  }

  async getThreadParticipantIds(threadId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: threadParticipants.userId })
      .from(threadParticipants)
      .where(eq(threadParticipants.threadId, threadId));
    return rows.map((r) => r.userId);
  }

  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<void> {
    const { userId: _ignored, ...safeUpdates } = updates as any;
    const existing = await this.getUserSettings(userId);
    if (existing) {
      await db
        .update(userSettings)
        .set(safeUpdates)
        .where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({ userId, ...safeUpdates });
    }
  }

  async getMonetizationSettings(userId: string): Promise<MonetizationSettings | null> {
    const [settings] = await db
      .select()
      .from(monetizationSettings)
      .where(eq(monetizationSettings.userId, userId));
    return settings || null;
  }

  async updateMonetizationSettings(
    userId: string,
    updates: Partial<MonetizationSettings>,
  ): Promise<void> {
    const { userId: _ignored, ...safeUpdates } = updates as any;
    const existing = await this.getMonetizationSettings(userId);
    if (existing) {
      await db
        .update(monetizationSettings)
        .set(safeUpdates)
        .where(eq(monetizationSettings.userId, userId));
    } else {
      await db.insert(monetizationSettings).values({ userId, ...safeUpdates });
    }
  }

  async searchUsers(query: string, currentUserId: string): Promise<any[]> {
    let normalized = query.trim();
    if (normalized.startsWith("@")) normalized = normalized.slice(1);
    if (normalized.startsWith("+1")) normalized = normalized.slice(2);
    if (normalized.startsWith("+")) normalized = normalized.slice(1);
    if (!normalized) return [];

    const pattern = `%${normalized}%`;
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isOnline: users.isOnline,
      })
      .from(users)
      .where(
        and(
          ne(users.id, currentUserId),
          or(
            ilike(users.displayName, pattern),
            ilike(users.username, pattern),
            ilike(users.phone, pattern),
          ),
        ),
      )
      .limit(20);

    return results;
  }

  async getBuddyIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ buddyId: buddyConnections.buddyId, peerId: buddyConnections.userId })
      .from(buddyConnections)
      .where(
        and(
          or(
            eq(buddyConnections.userId, userId),
            eq(buddyConnections.buddyId, userId),
          ),
          eq(buddyConnections.status, "accepted"),
        ),
      );
    return rows.map((r) => (r.buddyId === userId ? r.peerId : r.buddyId));
  }

  async addBuddy(userId: string, buddyId: string): Promise<void> {
    try {
      await db.insert(buddyConnections).values({ userId, buddyId, status: "accepted" });
    } catch {
      // already exists
    }
  }

  async getBuddyFeedPosts(userId: string, buddyIds: string[]): Promise<any[]> {
    const allIds = [userId, ...buddyIds];
    const posts = await db
      .select({
        id: feedPosts.id,
        userId: feedPosts.userId,
        username: users.username,
        avatar: users.avatarUrl,
        content: feedPosts.content,
        mediaType: feedPosts.mediaType,
        mediaUrl: feedPosts.mediaUrl,
        audience: feedPosts.audience,
        kindnessEarned: feedPosts.kindnessEarned,
        likesCount: feedPosts.likesCount,
        commentsCount: feedPosts.commentsCount,
        createdAt: feedPosts.createdAt,
      })
      .from(feedPosts)
      .innerJoin(users, eq(feedPosts.userId, users.id))
      .where(
        and(
          inArray(feedPosts.userId, allIds),
          or(
            eq(feedPosts.audience, "everyone"),
            eq(feedPosts.audience, "buddy"),
            eq(feedPosts.userId, userId),
          ),
        ),
      )
      .orderBy(desc(feedPosts.createdAt))
      .limit(30);

    return posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      content: p.content,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl,
      audience: p.audience,
      timestamp: p.createdAt.getTime(),
      kindnessEarned: p.kindnessEarned,
      likes: p.likesCount,
      comments: p.commentsCount,
    }));
  }

  async getNearbyFeedPosts(nearbyUserIds: string[]): Promise<any[]> {
    if (nearbyUserIds.length === 0) return [];
    const posts = await db
      .select({
        id: feedPosts.id,
        userId: feedPosts.userId,
        username: users.username,
        avatar: users.avatarUrl,
        content: feedPosts.content,
        mediaType: feedPosts.mediaType,
        mediaUrl: feedPosts.mediaUrl,
        audience: feedPosts.audience,
        kindnessEarned: feedPosts.kindnessEarned,
        likesCount: feedPosts.likesCount,
        commentsCount: feedPosts.commentsCount,
        createdAt: feedPosts.createdAt,
      })
      .from(feedPosts)
      .innerJoin(users, eq(feedPosts.userId, users.id))
      .where(
        and(
          inArray(feedPosts.userId, nearbyUserIds),
          or(
            eq(feedPosts.audience, "everyone"),
            eq(feedPosts.audience, "nearby"),
          ),
        ),
      )
      .orderBy(desc(feedPosts.createdAt))
      .limit(30);

    return posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      content: p.content,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl,
      audience: p.audience,
      timestamp: p.createdAt.getTime(),
      kindnessEarned: p.kindnessEarned,
      likes: p.likesCount,
      comments: p.commentsCount,
    }));
  }

  async getNearbyBuddies(userId: string, radiusMeters = 400): Promise<any[]> {
    const buddyIds = await this.getBuddyIds(userId);
    if (buddyIds.length === 0) return [];
    const allNearby = await this.getNearbyUsers(userId, radiusMeters);
    return allNearby.filter((u) => buddyIds.includes(u.id));
  }

  async getNearbyNonBuddies(userId: string, radiusMeters = 400): Promise<any[]> {
    const buddyIds = await this.getBuddyIds(userId);
    const allNearby = await this.getNearbyUsers(userId, radiusMeters);
    return allNearby.filter((u) => !buddyIds.includes(u.id));
  }

  async setUserOnline(userId: string, online: boolean): Promise<void> {
    const updates: any = { isOnline: online };
    if (online) {
      updates.lastSeenAt = new Date();
    }
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  async removeBuddy(userId: string, buddyId: string): Promise<void> {
    await db.delete(buddyConnections).where(
      or(
        and(
          eq(buddyConnections.userId, userId),
          eq(buddyConnections.buddyId, buddyId),
          eq(buddyConnections.status, "accepted"),
        ),
        and(
          eq(buddyConnections.userId, buddyId),
          eq(buddyConnections.buddyId, userId),
          eq(buddyConnections.status, "accepted"),
        ),
      ),
    );
  }

  async getPostComments(postId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: feedComments.id,
        postId: feedComments.postId,
        userId: feedComments.userId,
        text: feedComments.text,
        kindnessScore: feedComments.kindnessScore,
        createdAt: feedComments.createdAt,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatarUrl,
      })
      .from(feedComments)
      .innerJoin(users, eq(feedComments.userId, users.id))
      .where(eq(feedComments.postId, postId))
      .orderBy(desc(feedComments.createdAt));

    return rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      text: r.text,
      kindnessScore: r.kindnessScore,
      username: r.username,
      displayName: r.displayName,
      avatar: r.avatar || "",
      timestamp: r.createdAt.getTime(),
    }));
  }

  async getPostOwner(postId: string): Promise<string | null> {
    const [post] = await db
      .select({ userId: feedPosts.userId })
      .from(feedPosts)
      .where(eq(feedPosts.id, postId));
    return post?.userId || null;
  }

  async getCommentOwnerAndPost(commentId: string): Promise<{ userId: string; postId: string } | null> {
    const [comment] = await db
      .select({ userId: feedComments.userId, postId: feedComments.postId })
      .from(feedComments)
      .where(eq(feedComments.id, commentId));
    return comment || null;
  }

  async awardKindnessForLike(postId: string, likerId: string): Promise<void> {
    const postOwner = await this.getPostOwner(postId);
    if (!postOwner || postOwner === likerId) return;

    try {
      await db.insert(kindnessActions).values({
        actorUserId: likerId,
        targetType: "post_like",
        targetId: postId,
        delta: 5,
      });
      await this.addKindnessPoints(likerId, 5, "Liked a post");
    } catch {
      // TODO: anti-abuse — duplicate like kindness already awarded
    }
  }

  async awardPostKindness(postId: string, actorUserId: string, delta: number): Promise<void> {
    const postOwner = await this.getPostOwner(postId);
    if (!postOwner) throw new Error("Post not found");
    if (postOwner === actorUserId) throw new Error("Cannot award kindness on own post");

    try {
      await db.insert(kindnessActions).values({
        actorUserId,
        targetType: "post",
        targetId: postId,
        delta,
      });
    } catch {
      throw new Error("Already awarded kindness on this post");
    }

    await db
      .update(feedPosts)
      .set({ kindnessEarned: sql`${feedPosts.kindnessEarned} + ${delta}` })
      .where(eq(feedPosts.id, postId));

    await db
      .update(users)
      .set({ kindnessScore: sql`${users.kindnessScore} + ${delta}` })
      .where(eq(users.id, postOwner));

    await db.insert(kindnessLedger).values({
      userId: postOwner,
      points: delta,
      description: delta > 0 ? "Received kindness on post" : "Kindness subtracted on post",
      actionType: "post_kindness",
      actorUserId,
      targetType: "post",
      targetId: postId,
    });
  }

  async awardCommentKindness(commentId: string, actorUserId: string, delta: number): Promise<void> {
    const commentInfo = await this.getCommentOwnerAndPost(commentId);
    if (!commentInfo) throw new Error("Comment not found");

    const postOwner = await this.getPostOwner(commentInfo.postId);
    if (postOwner !== actorUserId) throw new Error("Only post owner can award kindness on comments");

    try {
      await db.insert(kindnessActions).values({
        actorUserId,
        targetType: "comment",
        targetId: commentId,
        delta,
      });
    } catch {
      throw new Error("Already awarded kindness on this comment");
    }

    await db
      .update(feedComments)
      .set({ kindnessScore: sql`${feedComments.kindnessScore} + ${delta}` })
      .where(eq(feedComments.id, commentId));

    await db
      .update(users)
      .set({ kindnessScore: sql`${users.kindnessScore} + ${delta}` })
      .where(eq(users.id, commentInfo.userId));

    await db.insert(kindnessLedger).values({
      userId: commentInfo.userId,
      points: delta,
      description: delta > 0 ? "Received kindness on comment" : "Kindness subtracted on comment",
      actionType: "comment_kindness",
      actorUserId,
      targetType: "comment",
      targetId: commentId,
    });
  }
}

export const storage = new DatabaseStorage();
