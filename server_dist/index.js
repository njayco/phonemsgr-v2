var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// server/session.ts
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  buddyConnections: () => buddyConnections,
  events: () => events,
  feedComments: () => feedComments,
  feedPosts: () => feedPosts,
  feedReactions: () => feedReactions,
  insertUserSchema: () => insertUserSchema,
  kindnessActions: () => kindnessActions,
  kindnessLedger: () => kindnessLedger,
  loginSchema: () => loginSchema,
  messageThreads: () => messageThreads,
  messages: () => messages,
  monetizationSettings: () => monetizationSettings,
  nearbyPresence: () => nearbyPresence,
  notifications: () => notifications,
  postViews: () => postViews,
  registerSchema: () => registerSchema,
  threadParticipants: () => threadParticipants,
  userBadges: () => userBadges,
  userEducation: () => userEducation,
  userInterests: () => userInterests,
  userSettings: () => userSettings,
  users: () => users
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  real,
  primaryKey,
  uniqueIndex,
  index,
  serial
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    displayName: text("display_name").notNull().default(""),
    phone: text("phone").default(""),
    avatarUrl: text("avatar_url").default(""),
    plan: text("plan").notNull().default("temp"),
    kindnessScore: integer("kindness_score").notNull().default(0),
    reputationLevel: integer("reputation_level").notNull().default(1),
    isOnline: boolean("is_online").notNull().default(false),
    inboxPrice: real("inbox_price").notNull().default(0),
    monthlyRevenue: real("monthly_revenue").notNull().default(0),
    connections: integer("connections").notNull().default(0),
    messagesCount: integer("messages_count").notNull().default(0),
    eventsCount: integer("events_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    pushToken: text("push_token"),
    lastSeenAt: timestamp("last_seen_at"),
    lastActiveAt: timestamp("last_active_at"),
    occupation: text("occupation").default(""),
    company: text("company").default(""),
    bio: text("bio").default(""),
    link: text("link").default(""),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("users_display_name_idx").on(table.displayName),
    index("users_phone_idx").on(table.phone)
  ]
);
var userInterests = pgTable(
  "user_interests",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    interest: text("interest").notNull()
  },
  (table) => [uniqueIndex("user_interest_unique").on(table.userId, table.interest)]
);
var userBadges = pgTable(
  "user_badges",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeName: text("badge_name").notNull()
  },
  (table) => [uniqueIndex("user_badge_unique").on(table.userId, table.badgeName)]
);
var messageThreads = pgTable("message_threads", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  isEncrypted: boolean("is_encrypted").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var threadParticipants = pgTable(
  "thread_participants",
  {
    threadId: varchar("thread_id", { length: 36 }).notNull().references(() => messageThreads.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    unreadCount: integer("unread_count").notNull().default(0),
    lastReadAt: timestamp("last_read_at")
  },
  (table) => [primaryKey({ columns: [table.threadId, table.userId] })]
);
var messages = pgTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id", { length: 36 }).notNull().references(() => messageThreads.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  mediaType: varchar("media_type", { length: 20 }),
  mediaUrl: text("media_url"),
  isViewOnce: boolean("is_view_once").notNull().default(false),
  viewedAt: timestamp("viewed_at"),
  viewedBy: varchar("viewed_by"),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  isDeliveredViaMesh: boolean("is_delivered_via_mesh").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var feedPosts = pgTable("feed_posts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  mediaType: text("media_type").notNull().default("text"),
  mediaUrl: text("media_url"),
  mediaUrls: text("media_urls").array(),
  audience: text("audience").notNull().default("everyone"),
  kindnessEarned: integer("kindness_earned").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var postViews = pgTable(
  "post_views",
  {
    id: serial("id").primaryKey(),
    postId: varchar("post_id", { length: 36 }).notNull().references(() => feedPosts.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at").defaultNow().notNull()
  },
  (table) => [uniqueIndex("post_view_unique").on(table.postId, table.userId)]
);
var feedComments = pgTable("feed_comments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id", { length: 36 }).notNull().references(() => feedPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isKind: boolean("is_kind").notNull().default(true),
  kindnessScore: integer("kindness_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var feedReactions = pgTable(
  "feed_reactions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    postId: varchar("post_id", { length: 36 }).notNull().references(() => feedPosts.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("like"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [uniqueIndex("feed_reaction_unique").on(table.postId, table.userId)]
);
var kindnessLedger = pgTable("kindness_ledger", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  actionType: text("action_type").default("manual"),
  actorUserId: varchar("actor_user_id", { length: 36 }),
  targetType: text("target_type"),
  targetId: varchar("target_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var kindnessActions = pgTable(
  "kindness_actions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    actorUserId: varchar("actor_user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: varchar("target_id", { length: 36 }).notNull(),
    delta: integer("delta").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  }
);
var buddyConnections = pgTable(
  "buddy_connections",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    buddyId: varchar("buddy_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("buddy_connection_unique").on(table.userId, table.buddyId),
    index("buddy_connections_user_status_idx").on(table.userId, table.status),
    index("buddy_connections_buddy_status_idx").on(table.buddyId, table.status)
  ]
);
var nearbyPresence = pgTable(
  "nearby_presence",
  {
    userId: varchar("user_id", { length: 36 }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
    latitude: real("latitude").notNull().default(0),
    longitude: real("longitude").notNull().default(0),
    radius: integer("radius").notNull().default(500),
    lastSeen: timestamp("last_seen").defaultNow().notNull()
  },
  (table) => [index("nearby_presence_last_seen_idx").on(table.lastSeen)]
);
var events = pgTable("events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  hostId: varchar("host_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  price: real("price").notNull().default(0),
  maxAttendees: integer("max_attendees").notNull().default(50),
  startTime: timestamp("start_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var monetizationSettings = pgTable("monetization_settings", {
  userId: varchar("user_id", { length: 36 }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  inboxPriceEnabled: boolean("inbox_price_enabled").notNull().default(false),
  inboxPrice: real("inbox_price").notNull().default(0),
  eventHostingEnabled: boolean("event_hosting_enabled").notNull().default(false)
});
var userSettings = pgTable("user_settings", {
  userId: varchar("user_id", { length: 36 }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  ghostMode: boolean("ghost_mode").notNull().default(false),
  interestDiscovery: boolean("interest_discovery").notNull().default(true),
  mutualFiltering: boolean("mutual_filtering").notNull().default(true),
  seeEveryone: boolean("see_everyone").notNull().default(false),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true)
});
var notifications = pgTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  relatedPostId: varchar("related_post_id", { length: 36 }),
  relatedUserId: varchar("related_user_id", { length: 36 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("notifications_user_idx").on(table.userId),
  index("notifications_user_unread_idx").on(table.userId, table.isRead)
]);
var userEducation = pgTable("user_education", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("college"),
  schoolName: text("school_name").notNull().default(""),
  degree: text("degree").default(""),
  major: text("major").default(""),
  graduationYear: integer("graduation_year"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  phone: true
});
var loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});
var registerSchema = z.object({
  username: z.string().min(1).max(14),
  password: z.string().min(4),
  displayName: z.string().min(1),
  phone: z.string().optional()
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/session.ts
var PgStore = connectPgSimple(session);
var isProduction = process.env.NODE_ENV === "production";
var sessionMiddleware = session({
  store: new PgStore({
    pool,
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || "phone-msgr-secret-key-2026",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1e3,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax"
  }
});

// server/storage.ts
import { eq, and, desc, sql as sql2, ne, inArray, or, ilike, isNull, isNotNull, lt } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  async getUserInterests(userId) {
    const rows = await db.select({ interest: userInterests.interest }).from(userInterests).where(eq(userInterests.userId, userId));
    return rows.map((r) => r.interest);
  }
  async setUserInterests(userId, interests) {
    await db.delete(userInterests).where(eq(userInterests.userId, userId));
    if (interests.length > 0) {
      await db.insert(userInterests).values(
        interests.map((interest) => ({ userId, interest }))
      );
    }
  }
  async getUserBadges(userId) {
    const rows = await db.select({ badgeName: userBadges.badgeName }).from(userBadges).where(eq(userBadges.userId, userId));
    return rows.map((r) => r.badgeName);
  }
  async getThreadsForUser(userId) {
    const participantRows = await db.select().from(threadParticipants).where(eq(threadParticipants.userId, userId));
    if (participantRows.length === 0) return [];
    const threadIds = participantRows.map((p) => p.threadId);
    const threads = await db.select().from(messageThreads).where(inArray(messageThreads.id, threadIds)).orderBy(desc(messageThreads.updatedAt));
    const result = [];
    for (const thread of threads) {
      const otherParticipants = await db.select().from(threadParticipants).innerJoin(users, eq(threadParticipants.userId, users.id)).where(
        and(
          eq(threadParticipants.threadId, thread.id),
          ne(threadParticipants.userId, userId)
        )
      );
      const myParticipant = participantRows.find((p) => p.threadId === thread.id);
      const lastMsgRows = await db.select().from(messages).where(eq(messages.threadId, thread.id)).orderBy(desc(messages.createdAt)).limit(1);
      const lastMsg = lastMsgRows[0];
      const other = otherParticipants[0];
      result.push({
        id: thread.id,
        participantId: other?.users?.id || "",
        participantName: other?.users?.displayName || "Unknown",
        participantAvatar: other?.users?.avatarUrl || "",
        lastMessage: lastMsg?.isDeleted ? "REDACTED" : lastMsg?.text || "",
        lastMessageTime: lastMsg?.createdAt?.getTime() || thread.createdAt.getTime(),
        unreadCount: myParticipant?.unreadCount || 0,
        isOnline: other?.users?.isOnline || false,
        isEncrypted: thread.isEncrypted
      });
    }
    return result;
  }
  async getOrCreateThread(userId, participantId) {
    const myThreads = await db.select({ threadId: threadParticipants.threadId }).from(threadParticipants).where(eq(threadParticipants.userId, userId));
    if (myThreads.length > 0) {
      const threadIds = myThreads.map((t) => t.threadId);
      const matching = await db.select({ threadId: threadParticipants.threadId }).from(threadParticipants).where(
        and(
          inArray(threadParticipants.threadId, threadIds),
          eq(threadParticipants.userId, participantId)
        )
      );
      if (matching.length > 0) {
        return matching[0].threadId;
      }
    }
    const [thread] = await db.insert(messageThreads).values({}).returning();
    await db.insert(threadParticipants).values([
      { threadId: thread.id, userId },
      { threadId: thread.id, userId: participantId }
    ]);
    return thread.id;
  }
  async getMessages(threadId, limit = 50, requesterId) {
    const rows = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(desc(messages.createdAt)).limit(limit);
    return rows.map((m) => {
      const hideViewOnceMedia = m.isViewOnce && requesterId && m.senderId !== requesterId;
      return {
        ...m,
        text: m.isDeleted ? "REDACTED" : m.text,
        mediaUrl: m.isDeleted ? null : hideViewOnceMedia ? null : m.mediaUrl,
        viewedAt: m.viewedAt?.toISOString() || null,
        createdAt: m.createdAt.toISOString(),
        deliveredAt: m.deliveredAt?.toISOString() || null,
        readAt: m.readAt?.toISOString() || null,
        deletedAt: m.deletedAt?.toISOString() || null
      };
    });
  }
  async createMessage(threadId, senderId, text2, isMesh = false, media) {
    const [msg] = await db.insert(messages).values({
      threadId,
      senderId,
      text: text2,
      isDeliveredViaMesh: isMesh,
      mediaType: media?.mediaType || null,
      mediaUrl: media?.mediaUrl || null,
      isViewOnce: media?.isViewOnce || false
    }).returning();
    await db.update(messageThreads).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(messageThreads.id, threadId));
    await db.update(threadParticipants).set({ unreadCount: sql2`${threadParticipants.unreadCount} + 1` }).where(
      and(
        eq(threadParticipants.threadId, threadId),
        ne(threadParticipants.userId, senderId)
      )
    );
    return msg;
  }
  async getMessageById(messageId) {
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
    return msg;
  }
  async markViewOnceOpened(messageId, viewerId) {
    const [msg] = await db.update(messages).set({ viewedAt: /* @__PURE__ */ new Date(), viewedBy: viewerId }).where(and(eq(messages.id, messageId), eq(messages.isViewOnce, true), isNull(messages.viewedAt))).returning();
    return msg;
  }
  async getViewOnceMessageByMediaUrl(mediaUrl) {
    const [msg] = await db.select().from(messages).where(and(eq(messages.mediaUrl, mediaUrl), eq(messages.isViewOnce, true)));
    return msg;
  }
  async getExpiredViewOnceMediaUrls(cutoff) {
    const rows = await db.select({ mediaUrl: messages.mediaUrl }).from(messages).where(
      and(
        eq(messages.isViewOnce, true),
        isNotNull(messages.mediaUrl),
        isNotNull(messages.viewedAt),
        lt(messages.viewedAt, cutoff)
      )
    );
    return rows.map((r) => r.mediaUrl).filter(Boolean);
  }
  async markMessagesRead(threadId, userId) {
    await db.update(threadParticipants).set({ unreadCount: 0, lastReadAt: /* @__PURE__ */ new Date() }).where(
      and(
        eq(threadParticipants.threadId, threadId),
        eq(threadParticipants.userId, userId)
      )
    );
    const unreadMsgs = await db.select({ id: messages.id, senderId: messages.senderId }).from(messages).where(
      and(
        eq(messages.threadId, threadId),
        ne(messages.senderId, userId),
        ne(messages.status, "read")
      )
    );
    if (unreadMsgs.length > 0) {
      const msgIds = unreadMsgs.map((m) => m.id);
      await db.update(messages).set({ status: "read", readAt: /* @__PURE__ */ new Date() }).where(inArray(messages.id, msgIds));
    }
    const senderIds = [...new Set(unreadMsgs.map((m) => m.senderId))];
    return senderIds;
  }
  async getFeedPosts(limit = 20) {
    const posts = await db.select({
      id: feedPosts.id,
      userId: feedPosts.userId,
      username: users.username,
      avatar: users.avatarUrl,
      content: feedPosts.content,
      mediaType: feedPosts.mediaType,
      mediaUrl: feedPosts.mediaUrl,
      mediaUrls: feedPosts.mediaUrls,
      kindnessEarned: feedPosts.kindnessEarned,
      likesCount: feedPosts.likesCount,
      commentsCount: feedPosts.commentsCount,
      viewsCount: feedPosts.viewsCount,
      createdAt: feedPosts.createdAt
    }).from(feedPosts).innerJoin(users, eq(feedPosts.userId, users.id)).orderBy(desc(feedPosts.createdAt)).limit(limit);
    return posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      content: p.content,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl,
      mediaUrls: p.mediaUrls || (p.mediaUrl && p.mediaType === "image" ? [p.mediaUrl] : null),
      timestamp: p.createdAt.getTime(),
      kindnessEarned: p.kindnessEarned,
      likes: p.likesCount,
      comments: p.commentsCount,
      views: p.viewsCount
    }));
  }
  async createFeedPost(userId, content, mediaType, mediaUrl, audience, mediaUrls) {
    const [post] = await db.insert(feedPosts).values({
      userId,
      content,
      mediaType,
      mediaUrl: mediaUrl || (mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : void 0),
      mediaUrls: mediaUrls && mediaUrls.length > 0 ? mediaUrls : void 0,
      audience: audience || "everyone"
    }).returning();
    return post;
  }
  async likePost(postId, userId) {
    try {
      await db.insert(feedReactions).values({ postId, userId, type: "like" });
      await db.update(feedPosts).set({ likesCount: sql2`${feedPosts.likesCount} + 1` }).where(eq(feedPosts.id, postId));
    } catch {
    }
  }
  async commentOnPost(postId, userId, text2) {
    await db.insert(feedComments).values({ postId, userId, text: text2 });
    await db.update(feedPosts).set({ commentsCount: sql2`${feedPosts.commentsCount} + 1` }).where(eq(feedPosts.id, postId));
  }
  async addKindnessPoints(userId, points, description) {
    await db.insert(kindnessLedger).values({ userId, points, description });
    await db.update(users).set({ kindnessScore: sql2`${users.kindnessScore} + ${points}` }).where(eq(users.id, userId));
  }
  async getKindnessHistory(userId, limit = 20) {
    return db.select().from(kindnessLedger).where(eq(kindnessLedger.userId, userId)).orderBy(desc(kindnessLedger.createdAt)).limit(limit);
  }
  async getNearbyUsers(userId, radiusMeters = 500) {
    const allPresence = await db.select({
      usrId: nearbyPresence.userId,
      latitude: nearbyPresence.latitude,
      longitude: nearbyPresence.longitude,
      lastSeen: nearbyPresence.lastSeen,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatarUrl,
      kindnessScore: users.kindnessScore,
      isOnline: users.isOnline
    }).from(nearbyPresence).innerJoin(users, eq(nearbyPresence.userId, users.id)).where(ne(nearbyPresence.userId, userId));
    const myPresence = await db.select().from(nearbyPresence).where(eq(nearbyPresence.userId, userId));
    const myLat = myPresence[0]?.latitude || 0;
    const myLng = myPresence[0]?.longitude || 0;
    const withDistance = allPresence.map((p) => {
      const distance = Math.round(
        Math.sqrt(Math.pow((p.latitude - myLat) * 111e3, 2) + Math.pow((p.longitude - myLng) * 111e3, 2))
      );
      const angle = Math.round(
        Math.atan2(p.longitude - myLng, p.latitude - myLat) * 180 / Math.PI
      );
      return {
        id: p.usrId,
        username: p.username,
        displayName: p.displayName,
        avatar: p.avatar || "",
        distance: Math.max(50, Math.min(distance, radiusMeters)),
        rawDistance: distance,
        interests: [],
        angle: (angle % 360 + 360) % 360,
        kindnessScore: p.kindnessScore,
        isOnline: p.isOnline
      };
    });
    return withDistance.filter((u) => u.rawDistance <= radiusMeters);
  }
  async updatePresence(userId, lat, lng) {
    await db.insert(nearbyPresence).values({ userId, latitude: lat, longitude: lng, lastSeen: /* @__PURE__ */ new Date() }).onConflictDoUpdate({
      target: nearbyPresence.userId,
      set: { latitude: lat, longitude: lng, lastSeen: /* @__PURE__ */ new Date() }
    });
  }
  async getUserSettings(userId) {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || null;
  }
  async isUserInThread(userId, threadId) {
    const [row] = await db.select({ threadId: threadParticipants.threadId }).from(threadParticipants).where(
      and(
        eq(threadParticipants.threadId, threadId),
        eq(threadParticipants.userId, userId)
      )
    );
    return !!row;
  }
  async getThreadParticipantIds(threadId) {
    const rows = await db.select({ userId: threadParticipants.userId }).from(threadParticipants).where(eq(threadParticipants.threadId, threadId));
    return rows.map((r) => r.userId);
  }
  async updateUserSettings(userId, updates) {
    const { userId: _ignored, ...safeUpdates } = updates;
    const existing = await this.getUserSettings(userId);
    if (existing) {
      await db.update(userSettings).set(safeUpdates).where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({ userId, ...safeUpdates });
    }
  }
  async getMonetizationSettings(userId) {
    const [settings] = await db.select().from(monetizationSettings).where(eq(monetizationSettings.userId, userId));
    return settings || null;
  }
  async updateMonetizationSettings(userId, updates) {
    const { userId: _ignored, ...safeUpdates } = updates;
    const existing = await this.getMonetizationSettings(userId);
    if (existing) {
      await db.update(monetizationSettings).set(safeUpdates).where(eq(monetizationSettings.userId, userId));
    } else {
      await db.insert(monetizationSettings).values({ userId, ...safeUpdates });
    }
  }
  async getEducation(userId) {
    return db.select().from(userEducation).where(eq(userEducation.userId, userId)).orderBy(desc(userEducation.graduationYear));
  }
  async addEducation(userId, data) {
    const [edu] = await db.insert(userEducation).values({
      userId,
      type: data.type || "college",
      schoolName: data.schoolName || "",
      degree: data.degree || "",
      major: data.major || "",
      graduationYear: data.graduationYear || null
    }).returning();
    return edu;
  }
  async updateEducation(id, userId, data) {
    const updates = {};
    if (data.type !== void 0) updates.type = data.type;
    if (data.schoolName !== void 0) updates.schoolName = data.schoolName;
    if (data.degree !== void 0) updates.degree = data.degree;
    if (data.major !== void 0) updates.major = data.major;
    if (data.graduationYear !== void 0) updates.graduationYear = data.graduationYear;
    const [edu] = await db.update(userEducation).set(updates).where(and(eq(userEducation.id, id), eq(userEducation.userId, userId))).returning();
    return edu || null;
  }
  async deleteEducation(id, userId) {
    const result = await db.delete(userEducation).where(and(eq(userEducation.id, id), eq(userEducation.userId, userId))).returning();
    return result.length > 0;
  }
  async recordPostView(postId, userId) {
    try {
      await db.insert(postViews).values({ postId, userId });
      await db.update(feedPosts).set({ viewsCount: sql2`${feedPosts.viewsCount} + 1` }).where(eq(feedPosts.id, postId));
    } catch {
    }
  }
  async getUserPosts(userId, limit = 20) {
    const posts = await db.select({
      id: feedPosts.id,
      userId: feedPosts.userId,
      username: users.username,
      avatar: users.avatarUrl,
      content: feedPosts.content,
      mediaType: feedPosts.mediaType,
      mediaUrl: feedPosts.mediaUrl,
      mediaUrls: feedPosts.mediaUrls,
      kindnessEarned: feedPosts.kindnessEarned,
      likesCount: feedPosts.likesCount,
      commentsCount: feedPosts.commentsCount,
      viewsCount: feedPosts.viewsCount,
      createdAt: feedPosts.createdAt
    }).from(feedPosts).innerJoin(users, eq(feedPosts.userId, users.id)).where(eq(feedPosts.userId, userId)).orderBy(desc(feedPosts.createdAt)).limit(limit);
    return posts.map((p) => ({
      ...p,
      timestamp: p.createdAt.getTime(),
      likes: p.likesCount,
      comments: p.commentsCount,
      views: p.viewsCount
    }));
  }
  async searchUsers(query, currentUserId) {
    let normalized = query.trim();
    if (normalized.startsWith("@")) normalized = normalized.slice(1);
    if (normalized.startsWith("+1")) normalized = normalized.slice(2);
    if (normalized.startsWith("+")) normalized = normalized.slice(1);
    if (!normalized) return [];
    const pattern = `%${normalized}%`;
    const results = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      isOnline: users.isOnline
    }).from(users).where(
      and(
        ne(users.id, currentUserId),
        or(
          ilike(users.displayName, pattern),
          ilike(users.username, pattern),
          ilike(users.phone, pattern)
        )
      )
    ).limit(20);
    return results;
  }
  async getBuddyIds(userId) {
    const rows = await db.select({ buddyId: buddyConnections.buddyId, peerId: buddyConnections.userId }).from(buddyConnections).where(
      and(
        or(
          eq(buddyConnections.userId, userId),
          eq(buddyConnections.buddyId, userId)
        ),
        eq(buddyConnections.status, "accepted")
      )
    );
    return rows.map((r) => r.buddyId === userId ? r.peerId : r.buddyId);
  }
  async addBuddy(userId, buddyId) {
    try {
      await db.insert(buddyConnections).values({ userId, buddyId, status: "accepted" });
    } catch {
    }
  }
  async getBuddyFeedPosts(userId, buddyIds) {
    const allIds = [userId, ...buddyIds];
    const posts = await db.select({
      id: feedPosts.id,
      userId: feedPosts.userId,
      username: users.username,
      avatar: users.avatarUrl,
      content: feedPosts.content,
      mediaType: feedPosts.mediaType,
      mediaUrl: feedPosts.mediaUrl,
      mediaUrls: feedPosts.mediaUrls,
      audience: feedPosts.audience,
      kindnessEarned: feedPosts.kindnessEarned,
      likesCount: feedPosts.likesCount,
      commentsCount: feedPosts.commentsCount,
      viewsCount: feedPosts.viewsCount,
      createdAt: feedPosts.createdAt
    }).from(feedPosts).innerJoin(users, eq(feedPosts.userId, users.id)).where(
      and(
        inArray(feedPosts.userId, allIds),
        or(
          eq(feedPosts.audience, "everyone"),
          eq(feedPosts.audience, "buddy"),
          eq(feedPosts.userId, userId)
        )
      )
    ).orderBy(desc(feedPosts.createdAt)).limit(30);
    return posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      content: p.content,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl,
      mediaUrls: p.mediaUrls || (p.mediaUrl && p.mediaType === "image" ? [p.mediaUrl] : null),
      audience: p.audience,
      timestamp: p.createdAt.getTime(),
      kindnessEarned: p.kindnessEarned,
      likes: p.likesCount,
      comments: p.commentsCount,
      views: p.viewsCount
    }));
  }
  async getNearbyFeedPosts(nearbyUserIds) {
    if (nearbyUserIds.length === 0) return [];
    const posts = await db.select({
      id: feedPosts.id,
      userId: feedPosts.userId,
      username: users.username,
      avatar: users.avatarUrl,
      content: feedPosts.content,
      mediaType: feedPosts.mediaType,
      mediaUrl: feedPosts.mediaUrl,
      mediaUrls: feedPosts.mediaUrls,
      audience: feedPosts.audience,
      kindnessEarned: feedPosts.kindnessEarned,
      likesCount: feedPosts.likesCount,
      commentsCount: feedPosts.commentsCount,
      viewsCount: feedPosts.viewsCount,
      createdAt: feedPosts.createdAt
    }).from(feedPosts).innerJoin(users, eq(feedPosts.userId, users.id)).where(
      and(
        inArray(feedPosts.userId, nearbyUserIds),
        or(
          eq(feedPosts.audience, "everyone"),
          eq(feedPosts.audience, "nearby")
        )
      )
    ).orderBy(desc(feedPosts.createdAt)).limit(30);
    return posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      content: p.content,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl,
      mediaUrls: p.mediaUrls || (p.mediaUrl && p.mediaType === "image" ? [p.mediaUrl] : null),
      audience: p.audience,
      timestamp: p.createdAt.getTime(),
      kindnessEarned: p.kindnessEarned,
      likes: p.likesCount,
      comments: p.commentsCount,
      views: p.viewsCount
    }));
  }
  async getNearbyBuddies(userId, radiusMeters = 400) {
    const buddyIds = await this.getBuddyIds(userId);
    if (buddyIds.length === 0) return [];
    const allNearby = await this.getNearbyUsers(userId, radiusMeters);
    return allNearby.filter((u) => buddyIds.includes(u.id));
  }
  async getNearbyNonBuddies(userId, radiusMeters = 400) {
    const buddyIds = await this.getBuddyIds(userId);
    const allNearby = await this.getNearbyUsers(userId, radiusMeters);
    return allNearby.filter((u) => !buddyIds.includes(u.id));
  }
  async setUserOnline(userId, online) {
    const updates = { isOnline: online };
    if (online) {
      updates.lastSeenAt = /* @__PURE__ */ new Date();
    }
    await db.update(users).set(updates).where(eq(users.id, userId));
  }
  async removeBuddy(userId, buddyId) {
    await db.delete(buddyConnections).where(
      or(
        and(
          eq(buddyConnections.userId, userId),
          eq(buddyConnections.buddyId, buddyId),
          eq(buddyConnections.status, "accepted")
        ),
        and(
          eq(buddyConnections.userId, buddyId),
          eq(buddyConnections.buddyId, userId),
          eq(buddyConnections.status, "accepted")
        )
      )
    );
  }
  async getPostComments(postId) {
    const rows = await db.select({
      id: feedComments.id,
      postId: feedComments.postId,
      userId: feedComments.userId,
      text: feedComments.text,
      kindnessScore: feedComments.kindnessScore,
      createdAt: feedComments.createdAt,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatarUrl
    }).from(feedComments).innerJoin(users, eq(feedComments.userId, users.id)).where(eq(feedComments.postId, postId)).orderBy(desc(feedComments.createdAt));
    return rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      text: r.text,
      kindnessScore: r.kindnessScore,
      username: r.username,
      displayName: r.displayName,
      avatar: r.avatar || "",
      timestamp: r.createdAt.getTime()
    }));
  }
  async getPostOwner(postId) {
    const [post] = await db.select({ userId: feedPosts.userId }).from(feedPosts).where(eq(feedPosts.id, postId));
    return post?.userId || null;
  }
  async getCommentOwnerAndPost(commentId) {
    const [comment] = await db.select({ userId: feedComments.userId, postId: feedComments.postId }).from(feedComments).where(eq(feedComments.id, commentId));
    return comment || null;
  }
  async awardKindnessForLike(postId, likerId) {
    const postOwner = await this.getPostOwner(postId);
    if (!postOwner || postOwner === likerId) return;
    const existing = await this.getUserKindnessDelta(likerId, "post_like", postId);
    if (existing !== 0) return;
    await db.insert(kindnessActions).values({
      actorUserId: likerId,
      targetType: "post_like",
      targetId: postId,
      delta: 5
    });
    await this.addKindnessPoints(likerId, 5, "Liked a post");
  }
  async getUserKindnessDelta(actorUserId, targetType, targetId) {
    const [result] = await db.select({ total: sql2`COALESCE(SUM(${kindnessActions.delta}), 0)::int` }).from(kindnessActions).where(
      and(
        eq(kindnessActions.actorUserId, actorUserId),
        eq(kindnessActions.targetType, targetType),
        eq(kindnessActions.targetId, targetId)
      )
    );
    return result?.total || 0;
  }
  async awardPostKindness(postId, actorUserId, delta) {
    const postOwner = await this.getPostOwner(postId);
    if (!postOwner) throw new Error("Post not found");
    if (postOwner === actorUserId) throw new Error("Cannot award kindness on own post");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtext($1 || ':post:' || $2))`,
        [actorUserId, postId]
      );
      const sumResult = await client.query(
        `SELECT COALESCE(SUM(delta), 0)::int AS total FROM kindness_actions WHERE actor_user_id = $1 AND target_type = 'post' AND target_id = $2`,
        [actorUserId, postId]
      );
      const currentDelta = sumResult.rows[0]?.total || 0;
      const newTotal = currentDelta + delta;
      if (newTotal > 10) {
        await client.query("ROLLBACK");
        throw new Error("Maximum +10 kindness reached on this post");
      }
      if (newTotal < -10) {
        await client.query("ROLLBACK");
        throw new Error("Maximum -10 kindness reached on this post");
      }
      await client.query(
        `INSERT INTO kindness_actions (id, actor_user_id, target_type, target_id, delta, created_at) VALUES (gen_random_uuid(), $1, 'post', $2, $3, NOW())`,
        [actorUserId, postId, delta]
      );
      await client.query(
        `UPDATE feed_posts SET kindness_earned = kindness_earned + $1 WHERE id = $2`,
        [delta, postId]
      );
      await client.query(
        `UPDATE users SET kindness_score = kindness_score + $1 WHERE id = $2`,
        [delta, postOwner]
      );
      await client.query(
        `INSERT INTO kindness_ledger (id, user_id, points, description, action_type, actor_user_id, target_type, target_id, created_at) VALUES (gen_random_uuid(), $1, $2, $3, 'post_kindness', $4, 'post', $5, NOW())`,
        [postOwner, delta, delta > 0 ? "Received kindness on post" : "Kindness subtracted on post", actorUserId, postId]
      );
      await client.query("COMMIT");
      return newTotal;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
      }
      throw err;
    } finally {
      client.release();
    }
  }
  async awardCommentKindness(commentId, actorUserId, delta) {
    const commentInfo = await this.getCommentOwnerAndPost(commentId);
    if (!commentInfo) throw new Error("Comment not found");
    const postOwner = await this.getPostOwner(commentInfo.postId);
    if (postOwner !== actorUserId) throw new Error("Only post owner can award kindness on comments");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtext($1 || ':comment:' || $2))`,
        [actorUserId, commentId]
      );
      const sumResult = await client.query(
        `SELECT COALESCE(SUM(delta), 0)::int AS total FROM kindness_actions WHERE actor_user_id = $1 AND target_type = 'comment' AND target_id = $2`,
        [actorUserId, commentId]
      );
      const currentDelta = sumResult.rows[0]?.total || 0;
      const newTotal = currentDelta + delta;
      if (newTotal > 10) {
        await client.query("ROLLBACK");
        throw new Error("Maximum +10 kindness reached on this comment");
      }
      if (newTotal < -10) {
        await client.query("ROLLBACK");
        throw new Error("Maximum -10 kindness reached on this comment");
      }
      await client.query(
        `INSERT INTO kindness_actions (id, actor_user_id, target_type, target_id, delta, created_at) VALUES (gen_random_uuid(), $1, 'comment', $2, $3, NOW())`,
        [actorUserId, commentId, delta]
      );
      await client.query(
        `UPDATE feed_comments SET kindness_score = kindness_score + $1 WHERE id = $2`,
        [delta, commentId]
      );
      await client.query(
        `UPDATE users SET kindness_score = kindness_score + $1 WHERE id = $2`,
        [delta, commentInfo.userId]
      );
      await client.query(
        `INSERT INTO kindness_ledger (id, user_id, points, description, action_type, actor_user_id, target_type, target_id, created_at) VALUES (gen_random_uuid(), $1, $2, $3, 'comment_kindness', $4, 'comment', $5, NOW())`,
        [commentInfo.userId, delta, delta > 0 ? "Received kindness on comment" : "Kindness subtracted on comment", actorUserId, commentId]
      );
      await client.query("COMMIT");
      return newTotal;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
      }
      throw err;
    } finally {
      client.release();
    }
  }
  async markMessageDelivered(messageId) {
    await db.update(messages).set({ status: "delivered", deliveredAt: /* @__PURE__ */ new Date() }).where(
      and(
        eq(messages.id, messageId),
        eq(messages.status, "sent")
      )
    );
  }
  async deleteMessage(messageId, userId, threadId) {
    const conditions = [eq(messages.id, messageId)];
    if (threadId) conditions.push(eq(messages.threadId, threadId));
    const [msg] = await db.select({ senderId: messages.senderId, threadId: messages.threadId }).from(messages).where(and(...conditions));
    if (!msg || msg.senderId !== userId) return false;
    await db.update(messages).set({ isDeleted: true, deletedAt: /* @__PURE__ */ new Date() }).where(eq(messages.id, messageId));
    return true;
  }
  async createNotification(userId, type, title, body, relatedPostId, relatedUserId) {
    const [notif] = await db.insert(notifications).values({ userId, type, title, body, relatedPostId, relatedUserId }).returning();
    return notif;
  }
  async getNotifications(userId, limit = 50) {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  }
  async markNotificationRead(notificationId, userId) {
    await db.update(notifications).set({ isRead: true }).where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    );
  }
  async getUnreadNotificationCount(userId) {
    const [result] = await db.select({ count: sql2`count(*)::int` }).from(notifications).where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
    return result?.count || 0;
  }
  async updatePushToken(userId, token) {
    await db.update(users).set({ pushToken: token }).where(eq(users.id, userId));
  }
  async getPushToken(userId) {
    const [user] = await db.select({ pushToken: users.pushToken }).from(users).where(eq(users.id, userId));
    return user?.pushToken || null;
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
import { ServerResponse } from "node:http";
var clients = /* @__PURE__ */ new Map();
var dttSessions = /* @__PURE__ */ new Map();
function dttBroadcast(session2, payload, exceptUserId) {
  const data = JSON.stringify(payload);
  for (const pid of session2.participants) {
    if (pid === exceptUserId) continue;
    const userClients = clients.get(pid);
    if (!userClients) continue;
    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }
}
function dttPruneSession(threadId, session2) {
  for (const pid of Array.from(session2.participants)) {
    const bound = session2.sockets.get(pid);
    const boundDead = bound !== void 0 && bound.readyState !== WebSocket.OPEN;
    if (!isUserOnlineWs(pid) || boundDead) {
      session2.participants.delete(pid);
      session2.sockets.delete(pid);
      if (session2.speakerId === pid) session2.speakerId = null;
    }
  }
  if (session2.speakerId && !isUserOnlineWs(session2.speakerId)) {
    session2.speakerId = null;
  }
  if (session2.participants.size === 0) dttSessions.delete(threadId);
}
function dttRemoveUser(threadId, userId) {
  const session2 = dttSessions.get(threadId);
  if (!session2 || !session2.participants.has(userId)) return;
  session2.participants.delete(userId);
  session2.sockets.delete(userId);
  if (session2.draining?.userId === userId) session2.draining = null;
  if (session2.speakerId === userId) {
    session2.speakerId = null;
    dttBroadcast(session2, { type: "dtt_talk_end", threadId, userId });
  }
  if (session2.participants.size === 0) {
    dttSessions.delete(threadId);
  } else {
    dttBroadcast(session2, { type: "dtt_peer_left", threadId, userId });
  }
}
function broadcastToUser(userId, payload) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  for (const client of userClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}
function isUserOnlineWs(userId) {
  const userClients = clients.get(userId);
  return !!userClients && userClients.length > 0;
}
function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const w = ws;
      if (w.isAlive === false) {
        w.terminate();
        continue;
      }
      w.isAlive = false;
      w.ping();
    }
  }, 1e4);
  heartbeat.unref?.();
  wss.on("close", () => clearInterval(heartbeat));
  wss.on("connection", (ws, req) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    let userId = "";
    const dummyRes = new ServerResponse(req);
    sessionMiddleware(req, dummyRes, () => {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId || ws.readyState !== WebSocket.OPEN) {
        ws.close(4401, "unauthenticated");
        return;
      }
      userId = sessionUserId;
      if (!clients.has(userId)) {
        clients.set(userId, []);
      }
      clients.get(userId).push({ ws, userId });
      storage.setUserOnline(userId, true).catch(() => {
      });
      ws.send(JSON.stringify({ type: "connected", userId }));
    });
    ws.on("message", (data) => {
      if (!userId) return;
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "typing" && userId && msg.threadId) {
          broadcastToThreadExcept(msg.threadId, userId, {
            type: "typing",
            threadId: msg.threadId,
            userId,
            text: msg.text || ""
          });
        }
        if (msg.type === "nudge" && userId && msg.threadId) {
          storage.getThreadParticipantIds(msg.threadId).then((participantIds) => {
            if (!participantIds.includes(userId)) return;
            const data2 = JSON.stringify({
              type: "nudge_received",
              threadId: msg.threadId,
              fromUserId: userId
            });
            for (const pid of participantIds) {
              if (pid === userId) continue;
              const userClients = clients.get(pid);
              if (userClients) {
                for (const client of userClients) {
                  if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(data2);
                  }
                }
              }
            }
          }).catch(() => {
          });
        }
        if (msg.type === "dtt_join" && userId && msg.threadId) {
          const threadId = msg.threadId;
          storage.getThreadParticipantIds(threadId).then((participantIds) => {
            if (!participantIds.includes(userId)) return;
            let session2 = dttSessions.get(threadId);
            if (session2) dttPruneSession(threadId, session2);
            session2 = dttSessions.get(threadId);
            if (!session2) {
              session2 = { participants: /* @__PURE__ */ new Set(), speakerId: null, sockets: /* @__PURE__ */ new Map(), draining: null };
              dttSessions.set(threadId, session2);
            }
            const isNew = !session2.participants.has(userId);
            session2.participants.add(userId);
            session2.sockets.set(userId, ws);
            if (session2.speakerId === userId) {
              session2.speakerId = null;
            }
            const peerIds = participantIds.filter((p) => p !== userId);
            const peerOnline = peerIds.some((p) => {
              const c = clients.get(p);
              return !!c && c.length > 0;
            });
            broadcastToUser(userId, {
              type: "dtt_state",
              threadId,
              speakerId: session2.speakerId,
              participants: Array.from(session2.participants),
              peerOnline
            });
            if (isNew) {
              dttBroadcast(session2, { type: "dtt_peer_joined", threadId, userId }, userId);
            }
            for (const pid of peerIds) {
              broadcastToUser(pid, { type: "dtt_invite", threadId, fromUserId: userId });
            }
          }).catch(() => {
          });
        }
        if (msg.type === "dtt_talk_start" && userId && msg.threadId) {
          const session2 = dttSessions.get(msg.threadId);
          if (session2 && session2.participants.has(userId)) {
            if (session2.speakerId === null || session2.speakerId === userId) {
              session2.speakerId = userId;
              session2.sockets.set(userId, ws);
              if (session2.draining?.userId !== userId) session2.draining = null;
              broadcastToUser(userId, { type: "dtt_talk_granted", threadId: msg.threadId, userId });
              dttBroadcast(session2, { type: "dtt_talk_start", threadId: msg.threadId, userId });
            } else {
              broadcastToUser(userId, { type: "dtt_denied", threadId: msg.threadId, speakerId: session2.speakerId });
            }
          }
        }
        if (msg.type === "dtt_audio" && userId && msg.threadId && typeof msg.data === "string" && msg.data.length < 6e5) {
          const session2 = dttSessions.get(msg.threadId);
          const inDrain = !!session2 && session2.speakerId === null && session2.draining !== null && session2.draining.userId === userId && Date.now() < session2.draining.until && session2.participants.has(userId);
          if (session2 && (session2.speakerId === userId || inDrain)) {
            dttBroadcast(session2, {
              type: "dtt_audio",
              threadId: msg.threadId,
              userId,
              seq: msg.seq,
              mime: msg.mime,
              data: msg.data
            }, userId);
          }
        }
        if (msg.type === "dtt_talk_end" && userId && msg.threadId) {
          const session2 = dttSessions.get(msg.threadId);
          if (session2 && session2.speakerId === userId) {
            session2.speakerId = null;
            session2.draining = { userId, until: Date.now() + 2e3 };
            dttBroadcast(session2, { type: "dtt_talk_end", threadId: msg.threadId, userId });
          }
        }
        if (msg.type === "dtt_leave" && userId && msg.threadId) {
          dttRemoveUser(msg.threadId, userId);
        }
        if (msg.type === "message_read" && userId && msg.threadId) {
          storage.markMessagesRead(msg.threadId, userId).then((senderIds) => {
            for (const senderId of senderIds) {
              broadcastToUser(senderId, {
                type: "messages_read",
                threadId: msg.threadId,
                readByUserId: userId
              });
            }
          }).catch(() => {
          });
        }
        if (userId && msg.type !== "auth") {
          storage.updateUser(userId, { lastActiveAt: /* @__PURE__ */ new Date() }).catch(() => {
          });
        }
      } catch {
      }
    });
    ws.on("close", () => {
      if (userId) {
        const userClients = clients.get(userId);
        if (userClients) {
          const filtered = userClients.filter((c) => c.ws !== ws);
          if (filtered.length === 0) {
            clients.delete(userId);
            storage.setUserOnline(userId, false).catch(() => {
            });
          } else {
            clients.set(userId, filtered);
          }
        }
        for (const [threadId, session2] of dttSessions) {
          if (session2.participants.has(userId) && session2.sockets.get(userId) === ws) {
            dttRemoveUser(threadId, userId);
          }
        }
      }
    });
  });
  function broadcastToThread(threadId, senderId, message, recipientIds) {
    const payload = JSON.stringify({
      type: "new_message",
      threadId,
      message
    });
    for (const recipientId of recipientIds) {
      const userClients = clients.get(recipientId);
      if (userClients) {
        for (const client of userClients) {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(payload);
          }
        }
      }
    }
  }
  function broadcastToThreadExcept(threadId, excludeUserId, payload) {
    storage.getThreadParticipantIds(threadId).then((participantIds) => {
      const data = JSON.stringify(payload);
      for (const pid of participantIds) {
        if (pid === excludeUserId) continue;
        const userClients = clients.get(pid);
        if (userClients) {
          for (const client of userClients) {
            if (client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(data);
            }
          }
        }
      }
    }).catch(() => {
    });
  }
  return broadcastToThread;
}

// server/seed.ts
import { eq as eq2 } from "drizzle-orm";
async function seedDatabase() {
  const [existing] = await db.select({ id: users.id }).from(users).limit(1);
  if (existing) {
    console.log("Database already seeded, skipping.");
    return;
  }
  console.log("Seeding database...");
  const password = await hashPassword("demo1234");
  const demoUsers = [
    {
      id: "user-1",
      username: "alexchen",
      password,
      displayName: "Alex Chen",
      plan: "executive",
      kindnessScore: 8420,
      reputationLevel: 8,
      isOnline: true,
      connections: 342,
      messagesCount: 1200,
      eventsCount: 18,
      monthlyRevenue: 2340,
      inboxPrice: 5
    },
    {
      id: "user-2",
      username: "barbaraw",
      password,
      displayName: "Barbara Whitehead",
      plan: "associate",
      kindnessScore: 5200,
      reputationLevel: 6,
      isOnline: true,
      connections: 156,
      messagesCount: 540,
      eventsCount: 5,
      monthlyRevenue: 890,
      inboxPrice: 2
    },
    {
      id: "user-3",
      username: "miastardust",
      password,
      displayName: "Mia Stardust",
      plan: "executive",
      kindnessScore: 6800,
      reputationLevel: 7,
      isOnline: true,
      connections: 210,
      messagesCount: 890,
      eventsCount: 12,
      monthlyRevenue: 1560,
      inboxPrice: 3
    },
    {
      id: "user-4",
      username: "leowave",
      password,
      displayName: "Leo Wave",
      plan: "associate",
      kindnessScore: 4300,
      reputationLevel: 5,
      isOnline: false,
      connections: 98,
      messagesCount: 320,
      eventsCount: 3,
      monthlyRevenue: 450,
      inboxPrice: 1.5
    },
    {
      id: "user-5",
      username: "chloeinnovate",
      password,
      displayName: "Chloe Innovate",
      plan: "temp",
      kindnessScore: 3100,
      reputationLevel: 4,
      isOnline: false,
      connections: 67,
      messagesCount: 180,
      eventsCount: 2,
      monthlyRevenue: 210,
      inboxPrice: 0
    },
    {
      id: "user-6",
      username: "alexquantum",
      password,
      displayName: "Alex Quantum",
      plan: "executive",
      kindnessScore: 9200,
      reputationLevel: 9,
      isOnline: true,
      connections: 520,
      messagesCount: 2100,
      eventsCount: 25,
      monthlyRevenue: 3800,
      inboxPrice: 10
    }
  ];
  await db.insert(users).values(demoUsers);
  const interestsMap = {
    "user-1": ["Tech", "Photography", "Coffee"],
    "user-2": ["Business", "Networking", "Travel"],
    "user-3": ["Photography", "Art", "Music"],
    "user-4": ["Music", "Gaming", "Surfing"],
    "user-5": ["Tech", "Innovation", "Design"],
    "user-6": ["Quantum Computing", "AI", "Community"]
  };
  for (const [userId, interests] of Object.entries(interestsMap)) {
    await db.insert(userInterests).values(interests.map((interest) => ({ userId, interest })));
  }
  const badgesMap = {
    "user-1": ["Top Contributor", "Verified Helper", "Community Leader"],
    "user-2": ["Networking Pro", "Event Host"],
    "user-3": ["Creative Star", "Community Supporter"],
    "user-6": ["Community Leader", "Top Contributor", "Verified Helper", "Mentor"]
  };
  for (const [userId, badges] of Object.entries(badgesMap)) {
    await db.insert(userBadges).values(badges.map((badgeName) => ({ userId, badgeName })));
  }
  const threadData = [
    { id: "thread-1", participants: ["user-1", "user-2"] },
    { id: "thread-2", participants: ["user-1", "user-3"] },
    { id: "thread-3", participants: ["user-1", "user-4"] },
    { id: "thread-4", participants: ["user-1", "user-5"] },
    { id: "thread-5", participants: ["user-1", "user-6"] }
  ];
  for (const t of threadData) {
    await db.insert(messageThreads).values({ id: t.id });
    await db.insert(threadParticipants).values(t.participants.map((userId) => ({ threadId: t.id, userId })));
  }
  const now = Date.now();
  const seedMessages = [
    { threadId: "thread-1", senderId: "user-1", text: "Hey! Looking forward to the community event this weekend.", createdAt: new Date(now - 6e5) },
    { threadId: "thread-1", senderId: "user-2", text: "Me too! I've been preparing my presentation.", createdAt: new Date(now - 54e4) },
    { threadId: "thread-1", senderId: "user-1", text: "That sounds great. What topic are you covering?", createdAt: new Date(now - 48e4) },
    { threadId: "thread-1", senderId: "user-2", text: "Building stronger community networks through kindness.", createdAt: new Date(now - 42e4) },
    { threadId: "thread-1", senderId: "user-1", text: "Perfect. That aligns with what we've been working on.", createdAt: new Date(now - 36e4) },
    { threadId: "thread-2", senderId: "user-3", text: "Check out these new photos from the gallery!", createdAt: new Date(now - 9e5) },
    { threadId: "thread-2", senderId: "user-1", text: "Wow, those look amazing! Great composition.", createdAt: new Date(now - 85e4) },
    { threadId: "thread-3", senderId: "user-4", text: "New track dropping tomorrow, stay tuned!", createdAt: new Date(now - 36e5) },
    { threadId: "thread-4", senderId: "user-5", text: "The presentation deck is ready for review.", createdAt: new Date(now - 72e5) },
    { threadId: "thread-5", senderId: "user-6", text: "Great community meetup yesterday!", createdAt: new Date(now - 144e5) }
  ];
  await db.insert(messages).values(seedMessages);
  await db.update(threadParticipants).set({ unreadCount: 2 }).where(
    eq2(threadParticipants.threadId, "thread-1")
  );
  await db.update(threadParticipants).set({ unreadCount: 1 }).where(
    eq2(threadParticipants.threadId, "thread-3")
  );
  await db.insert(buddyConnections).values([
    { userId: "user-1", buddyId: "user-2", status: "accepted" },
    { userId: "user-1", buddyId: "user-3", status: "accepted" },
    { userId: "user-1", buddyId: "user-6", status: "accepted" },
    { userId: "user-2", buddyId: "user-3", status: "accepted" },
    { userId: "user-4", buddyId: "user-5", status: "accepted" }
  ]);
  const seedPosts = [
    { userId: "user-6", content: "Quantum Community Livestream", mediaType: "video", audience: "everyone", kindnessEarned: 120, likesCount: 45, commentsCount: 12, createdAt: new Date(now - 12e4) },
    { userId: "user-3", content: "Gallery Opening Night", mediaType: "image", audience: "buddy", kindnessEarned: 95, likesCount: 32, commentsCount: 8, createdAt: new Date(now - 9e5) },
    { userId: "user-4", content: "New Track: Sonic Dreams", mediaType: "audio", audience: "nearby", kindnessEarned: 150, likesCount: 67, commentsCount: 23, createdAt: new Date(now - 36e5) },
    { userId: "user-5", content: "Future of Communication", mediaType: "document", audience: "everyone", kindnessEarned: 210, likesCount: 89, commentsCount: 31, createdAt: new Date(now - 108e5) },
    { userId: "user-1", content: "Great morning walk! The community park looks amazing today.", mediaType: "text", audience: "buddy", kindnessEarned: 30, likesCount: 12, commentsCount: 4, createdAt: new Date(now - 18e5) },
    { userId: "user-2", content: "Just finished the networking workshop. Incredible insights from everyone!", mediaType: "text", audience: "everyone", kindnessEarned: 45, likesCount: 18, commentsCount: 6, createdAt: new Date(now - 54e5) }
  ];
  const insertedPosts = await db.insert(feedPosts).values(seedPosts).returning();
  const sampleComments = [
    { postId: insertedPosts[0].id, userId: "user-1", text: "Amazing livestream! Learned so much.", createdAt: new Date(now - 6e4) },
    { postId: insertedPosts[0].id, userId: "user-2", text: "Thanks for sharing this!", createdAt: new Date(now - 5e4) },
    { postId: insertedPosts[1].id, userId: "user-1", text: "Beautiful work Mia!", createdAt: new Date(now - 8e5) },
    { postId: insertedPosts[2].id, userId: "user-5", text: "Can't wait to hear it!", createdAt: new Date(now - 35e5) },
    { postId: insertedPosts[4].id, userId: "user-2", text: "Looks so peaceful!", createdAt: new Date(now - 17e5) },
    { postId: insertedPosts[4].id, userId: "user-3", text: "Love it! Great morning energy.", createdAt: new Date(now - 16e5) },
    { postId: insertedPosts[5].id, userId: "user-1", text: "Great insights Barbara!", createdAt: new Date(now - 5e6) }
  ];
  await db.insert(feedComments).values(sampleComments);
  const activityEntries = [
    { userId: "user-1", points: 15, description: "Kindness Point for helping neighbor", actionType: "manual", createdAt: new Date(now - 72e5) },
    { userId: "user-1", points: 40, description: "Community Event Contribution", actionType: "manual", createdAt: new Date(now - 864e5) },
    { userId: "user-1", points: 5, description: "Liked a post", actionType: "post_like", actorUserId: "user-1", targetType: "post", targetId: insertedPosts[0].id, createdAt: new Date(now - 1e5) },
    { userId: "user-6", points: 10, description: "Received kindness on post", actionType: "post_kindness", actorUserId: "user-2", targetType: "post", targetId: insertedPosts[0].id, createdAt: new Date(now - 9e4) },
    { userId: "user-1", points: 25, description: "Kind Comment Bonus", actionType: "manual", createdAt: new Date(now - 3456e5) },
    { userId: "user-1", points: 100, description: "Event Host Reward", actionType: "manual", createdAt: new Date(now - 6048e5) }
  ];
  await db.insert(kindnessLedger).values(activityEntries);
  const presenceData = [
    { userId: "user-1", latitude: 40.7128, longitude: -74.006, lastSeen: new Date(now - 3e4) },
    { userId: "user-2", latitude: 40.713, longitude: -74.0058, lastSeen: new Date(now - 6e4) },
    { userId: "user-3", latitude: 40.7126, longitude: -74.0055, lastSeen: new Date(now - 12e4) },
    { userId: "user-4", latitude: 40.7132, longitude: -74.0065, lastSeen: new Date(now - 3e5) },
    { userId: "user-5", latitude: 40.7125, longitude: -74.007, lastSeen: new Date(now - 6e5) },
    { userId: "user-6", latitude: 40.7131, longitude: -74.005, lastSeen: new Date(now - 18e4) }
  ];
  await db.insert(nearbyPresence).values(presenceData);
  console.log("Database seeded successfully with demo data.");
}

// server/push.ts
async function sendPushNotification(pushToken, title, body, data) {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) {
    return false;
  }
  try {
    const message = {
      to: pushToken,
      title,
      body,
      data,
      sound: "default"
    };
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });
    if (!response.ok) {
      return false;
    }
    const result = await response.json();
    if (result.data?.status === "error") {
      if (result.data?.details?.error === "DeviceNotRegistered") {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
async function sendPushToUser(userId, title, body, data) {
  const token = await storage.getPushToken(userId);
  if (!token) return false;
  return sendPushNotification(token, title, body, data);
}

// server/uploads.ts
import multer from "multer";
import path from "path";
import fs from "fs";
var uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
var upload = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|gif|webp|heic|heif|mp4|mp3|pdf|ppt|pptx|doc|docx|wav|m4a|mov|avi|key|ogg/;
    const extOk = allowedExt.test(path.extname(file.originalname).toLowerCase().replace(".", ""));
    const allowedMime = /image\/|video\/|audio\/|application\/pdf|application\/vnd\.ms-powerpoint|application\/vnd\.openxmlformats|application\/msword|application\/vnd\.apple\.keynote|application\/octet-stream/;
    const mimeOk = allowedMime.test(file.mimetype);
    if (extOk && mimeOk) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type"));
  }
});
function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
var MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp"
};
function readUploadAsDataUri(mediaUrl) {
  const filename = path.basename(mediaUrl);
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) return null;
  const mime = MIME_BY_EXT[path.extname(filename).toLowerCase()] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString("base64")}`;
}
var VIEW_ONCE_WINDOW_MS = 2 * 60 * 1e3;
function deleteUploadFileByMediaUrl(mediaUrl) {
  const filename = path.basename(mediaUrl);
  const filePath = path.join(uploadDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[view-once] deleted expired file ${filename}`);
    }
  } catch (err) {
    console.error(`[view-once] failed to delete ${filename}:`, err);
  }
}
function scheduleViewOnceDeletion(mediaUrl) {
  const timer = setTimeout(() => deleteUploadFileByMediaUrl(mediaUrl), VIEW_ONCE_WINDOW_MS);
  timer.unref?.();
}
async function sweepExpiredViewOnceFiles() {
  try {
    const cutoff = new Date(Date.now() - VIEW_ONCE_WINDOW_MS);
    const mediaUrls = await storage.getExpiredViewOnceMediaUrls(cutoff);
    for (const mediaUrl of mediaUrls) {
      if (mediaUrl.startsWith("/uploads/")) {
        deleteUploadFileByMediaUrl(mediaUrl);
      }
    }
  } catch (err) {
    console.error("[view-once] sweep failed:", err);
  }
}
function startViewOnceCleanup() {
  sweepExpiredViewOnceFiles();
  const interval = setInterval(sweepExpiredViewOnceFiles, 60 * 1e3);
  interval.unref?.();
}
async function checkFileAccess(userId, filename) {
  const viewOnceMsg = await storage.getViewOnceMessageByMediaUrl(`/uploads/${filename}`);
  if (!viewOnceMsg || viewOnceMsg.senderId === userId) {
    return { ok: true };
  }
  return { ok: false, status: 403, message: "This photo can only be opened from the conversation" };
}
function setupUploadRoutes(app2) {
  app2.use(
    "/uploads",
    async (req, res) => {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const filename = path.basename(req.path);
      const filePath = path.join(uploadDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      try {
        const access = await checkFileAccess(userId, filename);
        if (!access.ok) {
          return res.status(access.status).json({ message: access.message });
        }
      } catch {
        return res.status(500).json({ message: "Failed to verify file access" });
      }
      return res.sendFile(filePath);
    }
  );
  app2.post("/api/upload/avatar", requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });
  app2.post("/api/upload/media", requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });
  app2.post("/api/upload/attachment", requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });
  app2.get("/api/download/:filename", requireAuth, async (req, res) => {
    const filename = path.basename(String(req.params.filename));
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    try {
      const userId = req.session.userId;
      const viewOnceMsg = await storage.getViewOnceMessageByMediaUrl(`/uploads/${filename}`);
      if (viewOnceMsg && viewOnceMsg.senderId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
    } catch {
      return res.status(500).json({ message: "Failed to verify file access" });
    }
    return res.download(filePath, filename);
  });
}

// server/routes.ts
function params(req) {
  return req.params;
}
function requireAuth2(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
async function registerRoutes(app2) {
  app2.use(sessionMiddleware);
  await seedDatabase();
  app2.post("/api/auth/register", async (req, res) => {
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
        phone: phone || ""
      });
      req.session.userId = user.id;
      const interests = await storage.getUserInterests(user.id);
      const badges = await storage.getUserBadges(user.id);
      const { password: _, ...safeUser } = user;
      return res.status(201).json({ ...safeUser, interests, badges });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
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
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    if (req.session.userId) {
      await storage.updateUser(req.session.userId, { isOnline: false });
    }
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
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
    const education = await storage.getEducation(user.id);
    const { password: _, ...safeUser } = user;
    return res.json({ ...safeUser, interests, badges, education, isOnline: true });
  });
  app2.get("/api/profile/:id", requireAuth2, async (req, res) => {
    const user = await storage.getUser(params(req).id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const interests = await storage.getUserInterests(user.id);
    const badges = await storage.getUserBadges(user.id);
    const education = await storage.getEducation(user.id);
    const { password: _, ...safeUser } = user;
    return res.json({ ...safeUser, interests, badges, education });
  });
  app2.patch("/api/profile", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const allowedFields = ["displayName", "avatarUrl", "phone", "inboxPrice", "occupation", "company", "bio", "link"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== void 0) {
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
  app2.get("/api/education", requireAuth2, async (req, res) => {
    const education = await storage.getEducation(req.session.userId);
    return res.json(education);
  });
  app2.post("/api/education", requireAuth2, async (req, res) => {
    const { type, schoolName, degree, major, graduationYear } = req.body;
    if (!schoolName) {
      return res.status(400).json({ message: "schoolName required" });
    }
    const edu = await storage.addEducation(req.session.userId, {
      type: type || "college",
      schoolName,
      degree: degree || "",
      major: major || "",
      graduationYear: graduationYear ? parseInt(graduationYear) : null
    });
    return res.json(edu);
  });
  app2.patch("/api/education/:id", requireAuth2, async (req, res) => {
    const edu = await storage.updateEducation(params(req).id, req.session.userId, req.body);
    if (!edu) {
      return res.status(404).json({ message: "Education entry not found" });
    }
    return res.json(edu);
  });
  app2.delete("/api/education/:id", requireAuth2, async (req, res) => {
    const deleted = await storage.deleteEducation(params(req).id, req.session.userId);
    if (!deleted) {
      return res.status(404).json({ message: "Education entry not found" });
    }
    return res.json({ success: true });
  });
  app2.get("/api/profile/:id/posts", requireAuth2, async (req, res) => {
    const posts = await storage.getUserPosts(params(req).id);
    return res.json(posts);
  });
  app2.get("/api/threads", requireAuth2, async (req, res) => {
    const threads = await storage.getThreadsForUser(req.session.userId);
    return res.json(threads);
  });
  app2.get("/api/threads/:id/messages", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const inThread = await storage.isUserInThread(userId, params(req).id);
    if (!inThread) {
      return res.status(403).json({ message: "Not a participant of this thread" });
    }
    const msgs = await storage.getMessages(params(req).id, 50, userId);
    const senderIds = await storage.markMessagesRead(params(req).id, userId);
    for (const senderId of senderIds) {
      broadcastToUser(senderId, {
        type: "messages_read",
        threadId: params(req).id,
        readByUserId: userId
      });
    }
    return res.json(msgs.reverse());
  });
  app2.post("/api/threads", requireAuth2, async (req, res) => {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ message: "participantId required" });
    }
    const threadId = await storage.getOrCreateThread(req.session.userId, participantId);
    return res.json({ threadId });
  });
  app2.post("/api/threads/:id/messages", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const threadId = params(req).id;
    const inThread = await storage.isUserInThread(userId, threadId);
    if (!inThread) {
      return res.status(403).json({ message: "Not a participant of this thread" });
    }
    const { text: text2, isMesh, mediaType, mediaUrl, isViewOnce } = req.body;
    if (!text2 && !mediaUrl) {
      return res.status(400).json({ message: "text or media required" });
    }
    if (mediaUrl && !["image", "gif"].includes(mediaType)) {
      return res.status(400).json({ message: "invalid mediaType" });
    }
    const msg = await storage.createMessage(threadId, userId, text2 || "", isMesh || false, {
      mediaType: mediaUrl ? mediaType : void 0,
      mediaUrl,
      isViewOnce: mediaType === "image" ? !!isViewOnce : false
    });
    const participantIds = await storage.getThreadParticipantIds(threadId);
    const recipientIds = participantIds.filter((id) => id !== userId);
    const msgPayload = {
      ...msg,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
      status: "sent"
    };
    const recipientPayload = msg.isViewOnce ? { ...msgPayload, mediaUrl: null } : msgPayload;
    const previewText = text2 ? text2 : mediaType === "gif" ? "Sent a GIF" : isViewOnce ? "Sent a view-once photo" : "Sent a photo";
    for (const recipientId of recipientIds) {
      broadcastToUser(recipientId, {
        type: "new_message",
        threadId,
        message: recipientPayload
      });
      const sender = await storage.getUser(userId);
      const senderName = sender?.displayName || sender?.username || "Someone";
      if (isUserOnlineWs(recipientId)) {
        await storage.markMessageDelivered(msg.id);
        broadcastToUser(userId, {
          type: "message_delivered",
          threadId,
          messageId: msg.id
        });
        msgPayload.status = "delivered";
      } else {
        sendPushToUser(recipientId, senderName, previewText, {
          type: "new_message",
          threadId
        }).catch(() => {
        });
      }
      const notif = await storage.createNotification(
        recipientId,
        "new_message",
        "New Message",
        `${senderName}: ${previewText.length > 50 ? previewText.slice(0, 50) + "..." : previewText}`,
        threadId,
        userId
      );
      broadcastToUser(recipientId, { type: "new_notification", notification: notif });
    }
    return res.json(msgPayload);
  });
  app2.post("/api/threads/:threadId/messages/:messageId/open", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const { threadId, messageId } = params(req);
    const inThread = await storage.isUserInThread(userId, threadId);
    if (!inThread) {
      return res.status(403).json({ message: "Not a participant of this thread" });
    }
    const msg = await storage.getMessageById(messageId);
    if (!msg || msg.threadId !== threadId || !msg.isViewOnce || msg.isDeleted) {
      return res.status(404).json({ message: "Message not found" });
    }
    if (msg.senderId === userId) {
      return res.status(403).json({ message: "Sender cannot open a view-once photo" });
    }
    if (msg.viewedAt) {
      return res.status(410).json({ message: "This photo has already been viewed" });
    }
    const opened = await storage.markViewOnceOpened(messageId, userId);
    if (!opened) {
      return res.status(410).json({ message: "This photo has already been viewed" });
    }
    broadcastToUser(msg.senderId, {
      type: "message_opened",
      threadId,
      messageId
    });
    if (msg.mediaUrl && msg.mediaUrl.startsWith("/uploads/")) {
      const dataUri = readUploadAsDataUri(msg.mediaUrl);
      if (!dataUri) {
        return res.status(404).json({ message: "Photo file not found" });
      }
      scheduleViewOnceDeletion(msg.mediaUrl);
      return res.json({ mediaUrl: dataUri });
    }
    return res.json({ mediaUrl: msg.mediaUrl });
  });
  app2.get("/api/giphy/gifs", requireAuth2, async (req, res) => {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "GIF search is not configured" });
    }
    const q = (req.query.q || "").trim();
    const kind = req.query.kind === "memes" ? "memes" : "gifs";
    const searchQuery = q || (kind === "memes" ? "meme reaction" : "");
    try {
      const params2 = new URLSearchParams({
        api_key: apiKey,
        limit: "24",
        rating: "pg-13"
      });
      let endpoint;
      if (searchQuery) {
        params2.set("q", searchQuery);
        endpoint = "https://api.giphy.com/v1/gifs/search";
      } else {
        endpoint = "https://api.giphy.com/v1/gifs/trending";
      }
      const giphyRes = await fetch(`${endpoint}?${params2.toString()}`);
      if (!giphyRes.ok) {
        return res.status(502).json({ message: "GIPHY request failed" });
      }
      const data = await giphyRes.json();
      const gifs = (data.data || []).map((g) => ({
        id: g.id,
        title: g.title || "",
        previewUrl: g.images?.fixed_width?.url || g.images?.original?.url,
        url: g.images?.fixed_height?.url || g.images?.original?.url
      })).filter((g) => g.url);
      return res.json(gifs);
    } catch {
      return res.status(502).json({ message: "GIPHY request failed" });
    }
  });
  app2.delete("/api/threads/:threadId/messages/:messageId", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const { threadId, messageId } = params(req);
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
        messageId
      });
    }
    return res.json({ success: true });
  });
  app2.get("/api/users/search", requireAuth2, async (req, res) => {
    const q = req.query.q || "";
    if (q.trim().length === 0) {
      return res.json([]);
    }
    const results = await storage.searchUsers(q, req.session.userId);
    return res.json(results);
  });
  app2.post("/api/buddies/:id", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const buddyId = params(req).id;
    if (userId === buddyId) {
      return res.status(400).json({ message: "Cannot add yourself" });
    }
    await storage.addBuddy(userId, buddyId);
    return res.json({ success: true });
  });
  app2.delete("/api/buddies/:id", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const buddyId = params(req).id;
    await storage.removeBuddy(userId, buddyId);
    return res.json({ success: true });
  });
  app2.get("/api/buddies", requireAuth2, async (req, res) => {
    const buddyIds = await storage.getBuddyIds(req.session.userId);
    return res.json(buddyIds);
  });
  app2.get("/api/feed", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const type = req.query.type;
    if (type === "buddy") {
      const buddyIds = await storage.getBuddyIds(userId);
      const posts2 = await storage.getBuddyFeedPosts(userId, buddyIds);
      return res.json(posts2);
    }
    if (type === "nearby") {
      const nearbyUsers = await storage.getNearbyUsers(userId, 400);
      const nearbyIds = nearbyUsers.map((u) => u.id);
      nearbyIds.push(userId);
      const posts2 = await storage.getNearbyFeedPosts(nearbyIds);
      return res.json(posts2);
    }
    const posts = await storage.getFeedPosts();
    return res.json(posts);
  });
  app2.post("/api/feed", requireAuth2, async (req, res) => {
    const { content, mediaType, mediaUrl, audience, mediaUrls } = req.body;
    const urls = Array.isArray(mediaUrls) ? mediaUrls.filter((u) => typeof u === "string" && u).slice(0, 10) : void 0;
    if (!(content || "").trim() && !mediaUrl && (!urls || urls.length === 0)) {
      return res.status(400).json({ message: "content or media required" });
    }
    const post = await storage.createFeedPost(
      req.session.userId,
      content || "",
      urls && urls.length > 0 ? "image" : mediaType || "text",
      mediaUrl,
      audience,
      urls
    );
    return res.status(201).json(post);
  });
  app2.post("/api/feed/:id/view", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    await storage.recordPostView(params(req).id, userId);
    return res.json({ success: true });
  });
  app2.post("/api/feed/:id/like", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    await storage.likePost(params(req).id, userId);
    await storage.awardKindnessForLike(params(req).id, userId);
    return res.json({ success: true });
  });
  app2.post("/api/feed/:id/comment", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const postId = params(req).id;
    const { text: text2 } = req.body;
    if (!text2) {
      return res.status(400).json({ message: "text required" });
    }
    await storage.commentOnPost(postId, userId, text2);
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
        userId
      );
      broadcastToUser(postOwner, { type: "new_comment", postId, comment: newComment });
      broadcastToUser(postOwner, { type: "new_notification", notification: notif });
      sendPushToUser(
        postOwner,
        "New Comment",
        `${commenter?.displayName || "Someone"} commented on your post`,
        { type: "new_comment", postId }
      ).catch(() => {
      });
    }
    return res.json({ success: true, comment: newComment });
  });
  app2.get("/api/feed/:id/comments", requireAuth2, async (req, res) => {
    const comments = await storage.getPostComments(params(req).id);
    return res.json(comments);
  });
  app2.post("/api/feed/:id/kindness", requireAuth2, async (req, res) => {
    try {
      const { delta } = req.body;
      if (delta !== 10 && delta !== -10) {
        return res.status(400).json({ message: "delta must be 10 or -10" });
      }
      const userId = req.session.userId;
      const postId = params(req).id;
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
          actorUsername: actor?.username || "Someone"
        });
        const notif = await storage.createNotification(
          postOwner,
          "kindness_award",
          delta > 0 ? "Kindness Received!" : "Kindness Deducted",
          `${actor?.displayName || "Someone"} ${delta > 0 ? "awarded" : "deducted"} ${Math.abs(delta)} kindness on your post`,
          postId,
          userId
        );
        broadcastToUser(postOwner, { type: "new_notification", notification: notif });
        sendPushToUser(
          postOwner,
          delta > 0 ? "Kindness Received! +" + delta : "Kindness Deducted " + delta,
          `${actor?.displayName || "Someone"} ${delta > 0 ? "awarded" : "deducted"} ${Math.abs(delta)} kindness on your post`,
          { type: "kindness_award", postId }
        ).catch(() => {
        });
      }
      return res.json({ success: true, delta, userDelta });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.get("/api/feed/:id/my-kindness", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const delta = await storage.getUserKindnessDelta(userId, "post", params(req).id);
    return res.json({ delta });
  });
  app2.post("/api/feed/comments/:id/kindness", requireAuth2, async (req, res) => {
    try {
      const { delta } = req.body;
      if (delta !== 10 && delta !== -10) {
        return res.status(400).json({ message: "delta must be 10 or -10" });
      }
      const userId = req.session.userId;
      const commentId = params(req).id;
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
          userId
        );
        broadcastToUser(commentInfo.userId, { type: "new_notification", notification: notif });
        sendPushToUser(
          commentInfo.userId,
          delta > 0 ? "Kindness Received!" : "Kindness Deducted",
          `${actor?.displayName || "Someone"} ${delta > 0 ? "awarded" : "deducted"} ${Math.abs(delta)} kindness on your comment`,
          { type: "kindness_award", postId: commentInfo.postId }
        ).catch(() => {
        });
      }
      return res.json({ success: true, delta, userDelta });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.get("/api/feed/comments/:id/my-kindness", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const delta = await storage.getUserKindnessDelta(userId, "comment", params(req).id);
    return res.json({ delta });
  });
  app2.get("/api/kindness/history", requireAuth2, async (req, res) => {
    const history = await storage.getKindnessHistory(req.session.userId);
    return res.json(history);
  });
  app2.get("/api/notifications", requireAuth2, async (req, res) => {
    const notifs = await storage.getNotifications(req.session.userId);
    return res.json(notifs);
  });
  app2.post("/api/notifications/:id/read", requireAuth2, async (req, res) => {
    await storage.markNotificationRead(params(req).id, req.session.userId);
    return res.json({ success: true });
  });
  app2.get("/api/notifications/unread-count", requireAuth2, async (req, res) => {
    const count = await storage.getUnreadNotificationCount(req.session.userId);
    return res.json({ count });
  });
  app2.post("/api/push-token", requireAuth2, async (req, res) => {
    const { token } = req.body;
    await storage.updatePushToken(req.session.userId, token || null);
    return res.json({ success: true });
  });
  app2.get("/api/nearby", requireAuth2, async (req, res) => {
    const userId = req.session.userId;
    const type = req.query.type;
    const radius = parseInt(req.query.radius) || 400;
    if (type === "buddy") {
      const nearby2 = await storage.getNearbyBuddies(userId, radius);
      return res.json(nearby2);
    }
    if (type === "nearby") {
      const nearby2 = await storage.getNearbyNonBuddies(userId, radius);
      return res.json(nearby2);
    }
    const nearby = await storage.getNearbyUsers(userId, radius);
    return res.json(nearby);
  });
  app2.post("/api/nearby/update", requireAuth2, async (req, res) => {
    const { latitude, longitude } = req.body;
    await storage.updatePresence(
      req.session.userId,
      latitude || 40.7128,
      longitude || -74.006
    );
    return res.json({ success: true });
  });
  app2.get("/api/settings", requireAuth2, async (req, res) => {
    const settings = await storage.getUserSettings(req.session.userId);
    return res.json(
      settings || {
        ghostMode: false,
        interestDiscovery: true,
        mutualFiltering: true,
        seeEveryone: false,
        notificationsEnabled: true
      }
    );
  });
  app2.patch("/api/settings", requireAuth2, async (req, res) => {
    const allowedFields = ["ghostMode", "interestDiscovery", "mutualFiltering", "seeEveryone", "notificationsEnabled"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== void 0) {
        updates[field] = req.body[field];
      }
    }
    await storage.updateUserSettings(req.session.userId, updates);
    const settings = await storage.getUserSettings(req.session.userId);
    return res.json(settings);
  });
  app2.get("/api/monetization", requireAuth2, async (req, res) => {
    const settings = await storage.getMonetizationSettings(req.session.userId);
    return res.json(
      settings || {
        inboxPriceEnabled: false,
        inboxPrice: 0,
        eventHostingEnabled: false
      }
    );
  });
  app2.patch("/api/monetization", requireAuth2, async (req, res) => {
    const allowedFields = ["inboxPriceEnabled", "inboxPrice", "eventHostingEnabled"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== void 0) {
        updates[field] = req.body[field];
      }
    }
    await storage.updateMonetizationSettings(req.session.userId, updates);
    const settings = await storage.getMonetizationSettings(req.session.userId);
    return res.json(settings);
  });
  const httpServer = createServer(app2);
  setupWebSocket(httpServer);
  return httpServer;
}

// server/index.ts
import * as fs2 from "fs";
import * as path2 from "path";
var app = express();
app.set("trust proxy", 1);
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    const addDomain = (domain) => {
      origins.add(`https://${domain}`);
      const firstDot = domain.indexOf(".");
      if (firstDot > 0) {
        origins.add(`https://${domain.slice(0, firstDot)}.expo${domain.slice(firstDot)}`);
      }
    };
    if (process.env.REPLIT_DEV_DOMAIN) {
      addDomain(process.env.REPLIT_DEV_DOMAIN);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        addDomain(d.trim());
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "5mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupUploadRoutes(app);
  startViewOnceCleanup();
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
