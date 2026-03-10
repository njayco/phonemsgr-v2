import { db } from "./db";
import {
  users,
  userInterests,
  userBadges,
  messageThreads,
  threadParticipants,
  messages,
  feedPosts,
  feedComments,
  kindnessLedger,
  nearbyPresence,
  buddyConnections,
} from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .limit(1);

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
      inboxPrice: 5.0,
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
      inboxPrice: 2.0,
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
      inboxPrice: 3.0,
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
      inboxPrice: 1.5,
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
      inboxPrice: 0,
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
      inboxPrice: 10.0,
    },
  ];

  await db.insert(users).values(demoUsers);

  const interestsMap: Record<string, string[]> = {
    "user-1": ["Tech", "Photography", "Coffee"],
    "user-2": ["Business", "Networking", "Travel"],
    "user-3": ["Photography", "Art", "Music"],
    "user-4": ["Music", "Gaming", "Surfing"],
    "user-5": ["Tech", "Innovation", "Design"],
    "user-6": ["Quantum Computing", "AI", "Community"],
  };

  for (const [userId, interests] of Object.entries(interestsMap)) {
    await db
      .insert(userInterests)
      .values(interests.map((interest) => ({ userId, interest })));
  }

  const badgesMap: Record<string, string[]> = {
    "user-1": ["Top Contributor", "Verified Helper", "Community Leader"],
    "user-2": ["Networking Pro", "Event Host"],
    "user-3": ["Creative Star", "Community Supporter"],
    "user-6": ["Community Leader", "Top Contributor", "Verified Helper", "Mentor"],
  };

  for (const [userId, badges] of Object.entries(badgesMap)) {
    await db
      .insert(userBadges)
      .values(badges.map((badgeName) => ({ userId, badgeName })));
  }

  const threadData = [
    { id: "thread-1", participants: ["user-1", "user-2"] },
    { id: "thread-2", participants: ["user-1", "user-3"] },
    { id: "thread-3", participants: ["user-1", "user-4"] },
    { id: "thread-4", participants: ["user-1", "user-5"] },
    { id: "thread-5", participants: ["user-1", "user-6"] },
  ];

  for (const t of threadData) {
    await db.insert(messageThreads).values({ id: t.id });
    await db
      .insert(threadParticipants)
      .values(t.participants.map((userId) => ({ threadId: t.id, userId })));
  }

  const now = Date.now();
  const seedMessages = [
    { threadId: "thread-1", senderId: "user-1", text: "Hey! Looking forward to the community event this weekend.", createdAt: new Date(now - 600000) },
    { threadId: "thread-1", senderId: "user-2", text: "Me too! I've been preparing my presentation.", createdAt: new Date(now - 540000) },
    { threadId: "thread-1", senderId: "user-1", text: "That sounds great. What topic are you covering?", createdAt: new Date(now - 480000) },
    { threadId: "thread-1", senderId: "user-2", text: "Building stronger community networks through kindness.", createdAt: new Date(now - 420000) },
    { threadId: "thread-1", senderId: "user-1", text: "Perfect. That aligns with what we've been working on.", createdAt: new Date(now - 360000) },
    { threadId: "thread-2", senderId: "user-3", text: "Check out these new photos from the gallery!", createdAt: new Date(now - 900000) },
    { threadId: "thread-2", senderId: "user-1", text: "Wow, those look amazing! Great composition.", createdAt: new Date(now - 850000) },
    { threadId: "thread-3", senderId: "user-4", text: "New track dropping tomorrow, stay tuned!", createdAt: new Date(now - 3600000) },
    { threadId: "thread-4", senderId: "user-5", text: "The presentation deck is ready for review.", createdAt: new Date(now - 7200000) },
    { threadId: "thread-5", senderId: "user-6", text: "Great community meetup yesterday!", createdAt: new Date(now - 14400000) },
  ];

  await db.insert(messages).values(seedMessages);

  await db
    .update(threadParticipants)
    .set({ unreadCount: 2 })
    .where(
      eq(threadParticipants.threadId, "thread-1"),
    );
  await db
    .update(threadParticipants)
    .set({ unreadCount: 1 })
    .where(
      eq(threadParticipants.threadId, "thread-3"),
    );

  await db.insert(buddyConnections).values([
    { userId: "user-1", buddyId: "user-2", status: "accepted" },
    { userId: "user-1", buddyId: "user-3", status: "accepted" },
    { userId: "user-1", buddyId: "user-6", status: "accepted" },
    { userId: "user-2", buddyId: "user-3", status: "accepted" },
    { userId: "user-4", buddyId: "user-5", status: "accepted" },
  ]);

  const seedPosts = [
    { userId: "user-6", content: "Quantum Community Livestream", mediaType: "video", audience: "everyone", kindnessEarned: 120, likesCount: 45, commentsCount: 12, createdAt: new Date(now - 120000) },
    { userId: "user-3", content: "Gallery Opening Night", mediaType: "image", audience: "buddy", kindnessEarned: 95, likesCount: 32, commentsCount: 8, createdAt: new Date(now - 900000) },
    { userId: "user-4", content: "New Track: Sonic Dreams", mediaType: "audio", audience: "nearby", kindnessEarned: 150, likesCount: 67, commentsCount: 23, createdAt: new Date(now - 3600000) },
    { userId: "user-5", content: "Future of Communication", mediaType: "document", audience: "everyone", kindnessEarned: 210, likesCount: 89, commentsCount: 31, createdAt: new Date(now - 10800000) },
    { userId: "user-1", content: "Great morning walk! The community park looks amazing today.", mediaType: "text", audience: "buddy", kindnessEarned: 30, likesCount: 12, commentsCount: 4, createdAt: new Date(now - 1800000) },
    { userId: "user-2", content: "Just finished the networking workshop. Incredible insights from everyone!", mediaType: "text", audience: "everyone", kindnessEarned: 45, likesCount: 18, commentsCount: 6, createdAt: new Date(now - 5400000) },
  ];

  const insertedPosts = await db.insert(feedPosts).values(seedPosts).returning();

  const sampleComments = [
    { postId: insertedPosts[0].id, userId: "user-1", text: "Amazing livestream! Learned so much.", createdAt: new Date(now - 60000) },
    { postId: insertedPosts[0].id, userId: "user-2", text: "Thanks for sharing this!", createdAt: new Date(now - 50000) },
    { postId: insertedPosts[1].id, userId: "user-1", text: "Beautiful work Mia!", createdAt: new Date(now - 800000) },
    { postId: insertedPosts[2].id, userId: "user-5", text: "Can't wait to hear it!", createdAt: new Date(now - 3500000) },
    { postId: insertedPosts[4].id, userId: "user-2", text: "Looks so peaceful!", createdAt: new Date(now - 1700000) },
    { postId: insertedPosts[4].id, userId: "user-3", text: "Love it! Great morning energy.", createdAt: new Date(now - 1600000) },
    { postId: insertedPosts[5].id, userId: "user-1", text: "Great insights Barbara!", createdAt: new Date(now - 5000000) },
  ];

  await db.insert(feedComments).values(sampleComments);

  const activityEntries = [
    { userId: "user-1", points: 15, description: "Kindness Point for helping neighbor", actionType: "manual" as const, createdAt: new Date(now - 7200000) },
    { userId: "user-1", points: 40, description: "Community Event Contribution", actionType: "manual" as const, createdAt: new Date(now - 86400000) },
    { userId: "user-1", points: 5, description: "Liked a post", actionType: "post_like" as const, actorUserId: "user-1", targetType: "post" as const, targetId: insertedPosts[0].id, createdAt: new Date(now - 100000) },
    { userId: "user-6", points: 10, description: "Received kindness on post", actionType: "post_kindness" as const, actorUserId: "user-2", targetType: "post" as const, targetId: insertedPosts[0].id, createdAt: new Date(now - 90000) },
    { userId: "user-1", points: 25, description: "Kind Comment Bonus", actionType: "manual" as const, createdAt: new Date(now - 345600000) },
    { userId: "user-1", points: 100, description: "Event Host Reward", actionType: "manual" as const, createdAt: new Date(now - 604800000) },
  ];

  await db.insert(kindnessLedger).values(activityEntries);

  const presenceData = [
    { userId: "user-1", latitude: 40.7128, longitude: -74.006, lastSeen: new Date(now - 30000) },
    { userId: "user-2", latitude: 40.7130, longitude: -74.0058, lastSeen: new Date(now - 60000) },
    { userId: "user-3", latitude: 40.7126, longitude: -74.0055, lastSeen: new Date(now - 120000) },
    { userId: "user-4", latitude: 40.7132, longitude: -74.0065, lastSeen: new Date(now - 300000) },
    { userId: "user-5", latitude: 40.7125, longitude: -74.0070, lastSeen: new Date(now - 600000) },
    { userId: "user-6", latitude: 40.7131, longitude: -74.0050, lastSeen: new Date(now - 180000) },
  ];

  await db.insert(nearbyPresence).values(presenceData);

  console.log("Database seeded successfully with demo data.");
}
