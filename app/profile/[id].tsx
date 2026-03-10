import { View, Text, ScrollView, StyleSheet, Pressable, Platform, ActivityIndicator, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/GlassCard';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import { fetch } from 'expo/fetch';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  kindnessScore: number;
  reputationLevel: number;
  plan: string;
  isOnline: boolean;
  connections: number;
  messagesCount: number;
  eventsCount: number;
  occupation?: string;
  company?: string;
  bio?: string;
  link?: string;
  badges: string[];
  education: any[];
}

interface PostData {
  id: string;
  content: string;
  mediaType: string;
  kindnessEarned: number;
  likes: number;
  comments: number;
  timestamp: number;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const isOwnProfile = currentUser?.id === id;

  const { data: profile, isLoading, isError } = useQuery<ProfileData>({
    queryKey: ['/api/profile', id],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/profile/${id}`, baseUrl);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error('Profile not found');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: posts } = useQuery<PostData[]>({
    queryKey: ['/api/profile', id, 'posts'],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/profile/${id}/posts`, baseUrl);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading || (!profile && !isError)) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accentBlue} />
        </View>
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-outline" size={48} color={Colors.dark.textMuted} />
          <Text style={styles.emptyText}>Profile not found</Text>
          <Pressable onPress={() => router.back()} style={styles.messageBtn}>
            <Text style={styles.messageBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const occupation = profile.occupation || '';
  const company = profile.company || '';
  const bio = profile.bio || '';
  const link = profile.link || '';
  const education = profile.education || [];
  const userPosts = posts || [];

  const handleLink = () => {
    if (link) {
      const url = link.startsWith('http') ? link : `https://${link}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleMessage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await apiRequest('POST', '/api/threads', { participantId: id });
      const data = await res.json();
      router.push({ pathname: '/chat/[id]', params: { id: data.threadId, name: profile.displayName || profile.username, participantId: id! } });
    } catch {
      router.push('/new-message');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        {isOwnProfile ? (
          <Pressable onPress={() => router.push('/edit-profile')} style={styles.editBtn}>
            <Ionicons name="create-outline" size={20} color={Colors.dark.accentBlue} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatarGlow, profile.isOnline && { borderColor: Colors.dark.onlineGreen }]}>
            <Avatar name={profile.displayName || profile.username} size={80} imageUrl={profile.avatarUrl} />
          </View>
          <Text style={styles.displayName}>{profile.displayName || profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {(occupation || company) ? (
            <View style={styles.workRow}>
              <Ionicons name="briefcase-outline" size={14} color={Colors.dark.textSecondary} />
              <Text style={styles.workText}>
                {occupation}{occupation && company ? ' at ' : ''}{company}
              </Text>
            </View>
          ) : null}
        </View>

        {bio ? (
          <Text style={styles.bioText}>{bio}</Text>
        ) : null}

        {link ? (
          <Pressable onPress={handleLink} style={styles.linkRow}>
            <Ionicons name="link-outline" size={16} color={Colors.dark.accentBlue} />
            <Text style={styles.linkText} numberOfLines={1}>{link}</Text>
          </Pressable>
        ) : null}

        {!isOwnProfile && (
          <Pressable style={styles.messageBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
            <Text style={styles.messageBtnText}>Message</Text>
          </Pressable>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={16} color={Colors.dark.kindnessGreen} />
            <Text style={styles.statValue}>{profile.kindnessScore.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Kindness</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.connections}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Lv.{profile.reputationLevel}</Text>
            <Text style={styles.statLabel}>Reputation</Text>
          </View>
        </View>

        {education.length > 0 && (
          <GlassCard>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu: any) => (
              <View key={edu.id} style={styles.eduRow}>
                <Ionicons
                  name={edu.type === 'high_school' ? 'school-outline' : 'library-outline'}
                  size={16}
                  color={Colors.dark.accentBlue}
                />
                <View style={styles.eduInfo}>
                  <Text style={styles.eduSchool}>{edu.schoolName}</Text>
                  {edu.type === 'college' && edu.degree ? (
                    <Text style={styles.eduDetail}>
                      {edu.degree}{edu.major ? ` in ${edu.major}` : ''}
                    </Text>
                  ) : null}
                  {edu.graduationYear ? (
                    <Text style={styles.eduYear}>Class of {edu.graduationYear}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        {(profile.badges || []).length > 0 && (
          <View style={styles.badgeRow}>
            {profile.badges.map((badge) => {
              const iconMap: Record<string, string> = {
                'Top Contributor': 'arrow-up-circle',
                'Verified Helper': 'shield-checkmark',
                'Community Leader': 'people',
              };
              return (
                <View key={badge} style={styles.badgeItem}>
                  <Ionicons name={(iconMap[badge] || 'star') as any} size={18} color={Colors.dark.accentBlue} />
                  <Text style={styles.badgeLabel}>{badge}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Posts ({userPosts.length})</Text>
          {userPosts.length === 0 ? (
            <Text style={styles.emptyText}>No posts yet</Text>
          ) : (
            userPosts.map((post) => (
              <GlassCard key={post.id} style={styles.postCard}>
                {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}
                <View style={styles.postMeta}>
                  <View style={styles.postStat}>
                    <Ionicons name="heart" size={12} color={Colors.dark.kindnessGreen} />
                    <Text style={styles.postStatText}>{post.kindnessEarned}</Text>
                  </View>
                  <View style={styles.postStat}>
                    <Ionicons name="thumbs-up" size={12} color={Colors.dark.textMuted} />
                    <Text style={styles.postStatText}>{post.likes}</Text>
                  </View>
                  <View style={styles.postStat}>
                    <Ionicons name="chatbubble" size={12} color={Colors.dark.textMuted} />
                    <Text style={styles.postStatText}>{post.comments}</Text>
                  </View>
                  <Text style={styles.postTime}>{timeAgo(post.timestamp)}</Text>
                </View>
              </GlassCard>
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, gap: 14, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', gap: 6, paddingTop: 8 },
  avatarGlow: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2,
    borderColor: Colors.dark.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  username: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  workRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  workText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  bioText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.text, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  linkText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.accentBlue },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.accentBlue,
  },
  messageBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.dark.glassBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.glassBorder, padding: 16 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  statDivider: { width: 1, backgroundColor: Colors.dark.separator },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, marginBottom: 8 },
  eduRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  eduInfo: { flex: 1, gap: 2 },
  eduSchool: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  eduDetail: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  eduYear: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badgeItem: { flex: 1, backgroundColor: Colors.dark.glassBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.glassBorder, padding: 10, alignItems: 'center', gap: 4 },
  badgeLabel: { fontSize: 9, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary, textAlign: 'center' },
  postsSection: { gap: 10 },
  postCard: { padding: 14 },
  postContent: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.text, lineHeight: 20, marginBottom: 10 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  postStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postStatText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  postTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, marginLeft: 'auto' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, textAlign: 'center', paddingVertical: 16 },
});
