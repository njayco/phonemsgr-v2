export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  kindnessScore: number;
  reputationLevel: number;
  plan: 'temp' | 'associate' | 'executive';
  isOnline: boolean;
  badges: string[];
  connections: number;
  messagesCount: number;
  eventsCount: number;
  interests: string[];
  monthlyRevenue: number;
  inboxPrice: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isDeliveredViaMesh: boolean;
}

export interface ChatThread {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isOnline: boolean;
  isEncrypted: boolean;
}

export interface FeedPost {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  mediaType: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  timestamp: number;
  kindnessEarned: number;
  likes: number;
  comments: number;
}

export interface NearbyUser {
  id: string;
  username: string;
  avatar: string;
  distance: number;
  interests: string[];
  angle: number;
  kindnessScore: number;
}

export interface ActivityItem {
  id: string;
  points: number;
  description: string;
  timeAgo: string;
}

export const CURRENT_USER: UserProfile = {
  id: 'user-1',
  username: 'alexchen',
  displayName: 'Alex Chen',
  avatar: '',
  kindnessScore: 8420,
  reputationLevel: 8,
  plan: 'executive',
  isOnline: true,
  badges: ['Top Contributor', 'Verified Helper', 'Community Leader'],
  connections: 342,
  messagesCount: 1200,
  eventsCount: 18,
  interests: ['Tech', 'Photography', 'Coffee'],
  monthlyRevenue: 2340,
  inboxPrice: 5.0,
};

export const CHAT_THREADS: ChatThread[] = [
  { id: 'chat-1', participantId: 'u2', participantName: 'Barbara Whitehead', participantAvatar: '', lastMessage: 'Hey! Looking forward to the event...', lastMessageTime: Date.now() - 300000, unreadCount: 2, isOnline: true, isEncrypted: true },
  { id: 'chat-2', participantId: 'u3', participantName: 'Mia Stardust', participantAvatar: '', lastMessage: 'Check out these new photos!', lastMessageTime: Date.now() - 900000, unreadCount: 0, isOnline: true, isEncrypted: true },
  { id: 'chat-3', participantId: 'u4', participantName: 'Leo Wave', participantAvatar: '', lastMessage: 'New track dropping tomorrow', lastMessageTime: Date.now() - 3600000, unreadCount: 1, isOnline: false, isEncrypted: true },
  { id: 'chat-4', participantId: 'u5', participantName: 'Chloe Innovate', participantAvatar: '', lastMessage: 'The presentation deck is ready', lastMessageTime: Date.now() - 7200000, unreadCount: 0, isOnline: false, isEncrypted: true },
  { id: 'chat-5', participantId: 'u6', participantName: 'Alex Quantum', participantAvatar: '', lastMessage: 'Great community meetup!', lastMessageTime: Date.now() - 14400000, unreadCount: 0, isOnline: true, isEncrypted: true },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'chat-1': [
    { id: 'm1', text: 'Hey! In never seen it a ping! What messages room?', senderId: 'user-1', timestamp: Date.now() - 600000, isDeliveredViaMesh: false },
    { id: 'm2', text: 'What can the process about everything?', senderId: 'u2', timestamp: Date.now() - 540000, isDeliveredViaMesh: false },
    { id: 'm3', text: "That's the new planning?", senderId: 'user-1', timestamp: Date.now() - 480000, isDeliveredViaMesh: false },
    { id: 'm4', text: "Boers are invited to makin sure and wor it's past instant tangs.", senderId: 'u2', timestamp: Date.now() - 420000, isDeliveredViaMesh: true },
    { id: 'm5', text: "Hey is your teacher thing with the collens seeing you to revinate your thank you.", senderId: 'user-1', timestamp: Date.now() - 360000, isDeliveredViaMesh: false },
  ],
};

export const FEED_POSTS: FeedPost[] = [
  { id: 'fp1', userId: 'u6', username: 'Alex_Quantum', avatar: '', content: '', mediaType: 'video', timestamp: Date.now() - 120000, kindnessEarned: 120, likes: 45, comments: 12 },
  { id: 'fp2', userId: 'u3', username: 'Mia_Stardust', avatar: '', content: '', mediaType: 'image', timestamp: Date.now() - 900000, kindnessEarned: 95, likes: 32, comments: 8 },
  { id: 'fp3', userId: 'u4', username: 'Leo_Wave', avatar: '', content: 'New Track: Sonic Dreams', mediaType: 'audio', timestamp: Date.now() - 3600000, kindnessEarned: 150, likes: 67, comments: 23 },
  { id: 'fp4', userId: 'u5', username: 'Chloe_Innovate', avatar: '', content: 'Future of Communication', mediaType: 'document', timestamp: Date.now() - 10800000, kindnessEarned: 210, likes: 89, comments: 31 },
];

export const NEARBY_USERS: NearbyUser[] = [
  { id: 'n1', username: 'Sarah_K', avatar: '', distance: 120, interests: ['Photography', 'Coffee'], angle: 45, kindnessScore: 3200 },
  { id: 'n2', username: 'Mike_T', avatar: '', distance: 340, interests: ['Tech', 'Gaming'], angle: 120, kindnessScore: 5100 },
  { id: 'n3', username: 'Raj_Dev', avatar: '', distance: 50, interests: ['Design', 'Gaming'], angle: 200, kindnessScore: 4500 },
  { id: 'n4', username: 'Lily_M', avatar: '', distance: 210, interests: ['Hiking', 'Music'], angle: 280, kindnessScore: 2800 },
  { id: 'n5', username: 'Tom_Z', avatar: '', distance: 380, interests: ['Art', 'Foodie'], angle: 330, kindnessScore: 6200 },
  { id: 'n6', username: 'Ava_Sol', avatar: '', distance: 290, interests: ['Yoga', 'Travel'], angle: 160, kindnessScore: 3900 },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  { id: 'a1', points: 15, description: 'Kindness Point for helping neighbor', timeAgo: '2h ago' },
  { id: 'a2', points: 40, description: 'Community Event Contribution', timeAgo: '1d ago' },
  { id: 'a3', points: 8, description: 'Shared Resources', timeAgo: '3d ago' },
  { id: 'a4', points: 25, description: 'Kind Comment Bonus', timeAgo: '4d ago' },
  { id: 'a5', points: 100, description: 'Event Host Reward', timeAgo: '1w ago' },
];

export const REVENUE_DATA = [420, 680, 890, 1200, 1580, 1890, 2340];
export const REVENUE_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
