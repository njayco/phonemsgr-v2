import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/GlassCard';
import { FEED_POSTS, type FeedPost } from '@/lib/mock-data';
import Colors from '@/constants/colors';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function MediaPreview({ type }: { type: string }) {
  const iconMap: Record<string, { name: string; color: string; bg: string }> = {
    video: { name: 'play-circle', color: Colors.dark.accentGreen, bg: 'rgba(0,255,136,0.08)' },
    image: { name: 'images', color: Colors.dark.accentBlue, bg: 'rgba(0,170,255,0.08)' },
    audio: { name: 'musical-notes', color: '#FF6B9D', bg: 'rgba(255,107,157,0.08)' },
    document: { name: 'document-text', color: Colors.dark.accentCyan, bg: 'rgba(0,229,255,0.08)' },
  };
  const info = iconMap[type] || iconMap.image;
  return (
    <View style={[styles.mediaPreview, { backgroundColor: info.bg }]}>
      <Ionicons name={info.name as any} size={32} color={info.color} />
    </View>
  );
}

function FeedPostItem({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);

  return (
    <GlassCard style={styles.postCard}>
      <View style={styles.postHeader}>
        <Avatar name={post.username} size={36} showGlow glowColor={Colors.dark.accentBlue} />
        <View style={styles.postInfo}>
          <Text style={styles.postUsername}>{post.username}</Text>
          <Text style={styles.postTime}>{timeAgo(post.timestamp)}</Text>
        </View>
      </View>

      {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}

      {post.mediaType !== 'text' && <MediaPreview type={post.mediaType} />}

      <View style={styles.postFooter}>
        <View style={styles.kindnessEarned}>
          <Ionicons name="heart" size={14} color={Colors.dark.kindnessGreen} />
          <Text style={styles.kindnessText}>+{post.kindnessEarned} Kindness Earned</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionButton}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLiked(!liked); }}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? Colors.dark.kindnessGreen : Colors.dark.textMuted} />
          <Text style={[styles.actionText, liked && { color: Colors.dark.kindnessGreen }]}>{post.likes + (liked ? 1 : 0)}</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.textMuted} />
          <Text style={styles.actionText}>{post.comments}</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color={Colors.dark.textMuted} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [feedTab, setFeedTab] = useState<'buddy' | 'nearby'>('buddy');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerTop}>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, feedTab === 'buddy' && styles.toggleBtnActive]}
              onPress={() => setFeedTab('buddy')}
            >
              <Text style={[styles.toggleText, feedTab === 'buddy' && styles.toggleTextActive]}>Buddy List</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, feedTab === 'nearby' && styles.toggleBtnActive]}
              onPress={() => setFeedTab('nearby')}
            >
              <Text style={[styles.toggleText, feedTab === 'nearby' && styles.toggleTextActive]}>Nearby 400m</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={FEED_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedPostItem post={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={FEED_POSTS.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  headerContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', backgroundColor: Colors.dark.surfaceElevated, borderRadius: 12, padding: 3 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  toggleBtnActive: { backgroundColor: Colors.dark.accentBlue },
  toggleText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  toggleTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 100 },
  postCard: { gap: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postInfo: { flex: 1 },
  postUsername: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  postTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  postContent: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.text, lineHeight: 20 },
  mediaPreview: { height: 120, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  postFooter: { flexDirection: 'row' },
  kindnessEarned: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.dark.accentGreenDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  kindnessText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.kindnessGreen },
  actionRow: { flexDirection: 'row', gap: 20, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.dark.separator },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  actionText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
});
