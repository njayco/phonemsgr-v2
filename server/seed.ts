import { db } from "./db";
import {
  users,
  userInterests,
  userBadges,
  messageThreads,
  threadParticipants,
  messages,
  feedPosts,
  kindnessLedger,
  nearbyPresence,
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

  const seedPosts = [
    { userId: "user-6", content: "Quantum Community Livestream", mediaType: "video", kindnessEarned: 120, likesCount: 45, commentsCount: 12, createdAt: new Date(now - 120000) },
    { userId: "user-3", content: "Gallery Opening Night", mediaType: "image", kindnessEarned: 95, likesCount: 32, commentsCount: 8, createdAt: new Date(now - 900000) },
    { userId: "user-4", content: "New Track: Sonic Dreams", mediaType: "audio", kindnessEarned: 150, likesCount: 67, commentsCount: 23, createdAt: new Date(now - 3600000) },
    { userId: "user-5", content: "Future of Communication", mediaType: "document", kindnessEarned: 210, likesCount: 89, commentsCount: 31, createdAt: new Date(now - 10800000) },
  ];

  await db.insert(feedPosts).values(seedPosts);

  const activityEntries = [
    { userId: "user-1", points: 15, description: "Kindness Point for helping neighbor", createdAt: new Date(now - 7200000) },
    { userId: "user-1", points: 40, description: "Community Event Contribution", createdAt: new Date(now - 86400000) },
    { userId: "user-1", points: 8, description: "Shared Resources", createdAt: new Date(now - 259200000) },
    { userId: "user-1", points: 25, description: "Kind Comment Bonus", createdAt: new Date(now - 345600000) },
    { userId: "user-1", points: 100, description: "Event Host Reward", createdAt: new Date(now - 604800000) },
  ];

  await db.insert(kindnessLedger).values(activityEntries);

  const presenceData = [
    { userId: "user-2", latitude: 40.7128, longitude: -74.006, lastSeen: new Date(now - 60000) },
    { userId: "user-3", latitude: 40.7135, longitude: -74.0055, lastSeen: new Date(now - 120000) },
    { userId: "user-4", latitude: 40.714, longitude: -74.0065, lastSeen: new Date(now - 300000) },
    { userId: "user-5", latitude: 40.7122, longitude: -74.007, lastSeen: new Date(now - 600000) },
    { userId: "user-6", latitude: 40.7145, longitude: -74.005, lastSeen: new Date(now - 180000) },
  ];

  await db.insert(nearbyPresence).values(presenceData);

  console.log("Database seeded successfully with demo data.");
}
