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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userInterests = pgTable(
  "user_interests",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    interest: text("interest").notNull(),
  },
  (table) => [uniqueIndex("user_interest_unique").on(table.userId, table.interest)],
);

export const userBadges = pgTable(
  "user_badges",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeName: text("badge_name").notNull(),
  },
  (table) => [uniqueIndex("user_badge_unique").on(table.userId, table.badgeName)],
);

export const messageThreads = pgTable("message_threads", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  isEncrypted: boolean("is_encrypted").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const threadParticipants = pgTable(
  "thread_participants",
  {
    threadId: varchar("thread_id", { length: 36 })
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    unreadCount: integer("unread_count").notNull().default(0),
    lastReadAt: timestamp("last_read_at"),
  },
  (table) => [primaryKey({ columns: [table.threadId, table.userId] })],
);

export const messages = pgTable("messages", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id", { length: 36 })
    .notNull()
    .references(() => messageThreads.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isDeliveredViaMesh: boolean("is_delivered_via_mesh").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedPosts = pgTable("feed_posts", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  mediaType: text("media_type").notNull().default("text"),
  mediaUrl: text("media_url"),
  kindnessEarned: integer("kindness_earned").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedComments = pgTable("feed_comments", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  postId: varchar("post_id", { length: 36 })
    .notNull()
    .references(() => feedPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isKind: boolean("is_kind").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedReactions = pgTable(
  "feed_reactions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    postId: varchar("post_id", { length: 36 })
      .notNull()
      .references(() => feedPosts.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("like"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("feed_reaction_unique").on(table.postId, table.userId)],
);

export const kindnessLedger = pgTable("kindness_ledger", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const buddyConnections = pgTable(
  "buddy_connections",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    buddyId: varchar("buddy_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("buddy_connection_unique").on(table.userId, table.buddyId)],
);

export const nearbyPresence = pgTable("nearby_presence", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  latitude: real("latitude").notNull().default(0),
  longitude: real("longitude").notNull().default(0),
  radius: integer("radius").notNull().default(500),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  hostId: varchar("host_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  price: real("price").notNull().default(0),
  maxAttendees: integer("max_attendees").notNull().default(50),
  startTime: timestamp("start_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const monetizationSettings = pgTable("monetization_settings", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  inboxPriceEnabled: boolean("inbox_price_enabled").notNull().default(false),
  inboxPrice: real("inbox_price").notNull().default(0),
  eventHostingEnabled: boolean("event_hosting_enabled").notNull().default(false),
});

export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  ghostMode: boolean("ghost_mode").notNull().default(false),
  interestDiscovery: boolean("interest_discovery").notNull().default(true),
  mutualFiltering: boolean("mutual_filtering").notNull().default(true),
  seeEveryone: boolean("see_everyone").notNull().default(false),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  phone: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  username: z.string().min(1).max(14),
  password: z.string().min(4),
  displayName: z.string().min(1),
  phone: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type MessageThread = typeof messageThreads.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type FeedPost = typeof feedPosts.$inferSelect;
export type KindnessEntry = typeof kindnessLedger.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type MonetizationSettings = typeof monetizationSettings.$inferSelect;
