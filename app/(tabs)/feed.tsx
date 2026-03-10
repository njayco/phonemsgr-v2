import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Platform, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/GlassCard';
import { apiRequest, queryClient, getApiUrl } from '@/lib/query-client';
import { useAuth } from '@/lib/auth-context';
import { cacheGet, cacheSet } from '@/lib/local-cache';
import Colors from '@/constants/colors';
import { fetch } from 'expo/fetch';

interface FeedPostData {
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

interface CommentData {
  id: string;
  postId: string;
  userId: string;
  text: string;
  kindnessScore: number;
  username: string;
  displayName: string;
  avatar: string;
  timestamp: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function kindnessColor(value: number): string {
  if (value > 0) return Colors.dark.kindnessGreen;
  if (value < 0) return Colors.dark.offlineRed;
  return Colors.dark.textMuted;
}

function kindnessLabel(value: number): string {
  if (value > 0) return `+${value} Kindness`;
  if (value < 0) return `${value} Kindness`;
  return '0 Kindness';
}

function kindnessBg(value: number): string {
  if (value > 0) return Colors.dark.accentGreenDim;
  if (value < 0) return 'rgba(255,68,68,0.15)';
  return 'rgba(255,255,255,0.06)';
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

function CommentItem({ comment, isPostOwner, onAwardKindness, commentDeltas, commentScoreOffsets }: {
  comment: CommentData;
  isPostOwner: boolean;
  onAwardKindness: (commentId: string, delta: number) => void;
  commentDeltas: Record<string, number>;
  commentScoreOffsets: Record<string, number>;
}) {
  const myDelta = commentDeltas[comment.id] || 0;
  const atMax = myDelta >= 10;
  const atMin = myDelta <= -10;
  const displayScore = comment.kindnessScore + (commentScoreOffsets[comment.id] || 0);

  return (
    <View style={styles.commentRow}>
      <Avatar name={comment.displayName || comment.username} size={24} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{comment.username}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.timestamp)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <View style={styles.commentFooter}>
          <View style={[styles.commentKindnessBadge, { backgroundColor: kindnessBg(displayScore) }]}>
            <Ionicons name="heart" size={10} color={kindnessColor(displayScore)} />
            <Text style={[styles.commentKindnessText, { color: kindnessColor(displayScore) }]}>
              {kindnessLabel(displayScore)}
            </Text>
          </View>
          {isPostOwner && (
            <View style={styles.commentKindnessActions}>
              <Pressable
                style={[styles.miniKindnessBtn, atMax && { opacity: 0.3 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAwardKindness(comment.id, 10);
                }}
                disabled={atMax}
              >
                <Text style={styles.miniKindnessPlus}>+10</Text>
              </Pressable>
              <Pressable
                style={[styles.miniKindnessBtn, atMin && { opacity: 0.3 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAwardKindness(comment.id, -10);
                }}
                disabled={atMin}
              >
                <Text style={styles.miniKindnessMinus}>-10</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function FeedPostItem({ post, currentUserId }: { post: FeedPostData; currentUserId: string }) {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [kindnessToast, setKindnessToast] = useState('');
  const [localKindness, setLocalKindness] = useState(post.kindnessEarned);
  const [myPostDelta, setMyPostDelta] = useState(0);
  const [commentDeltas, setCommentDeltas] = useState<Record<string, number>>({});
  const [commentScoreOffsets, setCommentScoreOffsets] = useState<Record<string, number>>({});
  const [postKindnessInFlight, setPostKindnessInFlight] = useState(false);
  const [commentKindnessInFlight, setCommentKindnessInFlight] = useState<Record<string, boolean>>({});
  const isPostOwner = post.userId === currentUserId;

  useEffect(() => {
    setLocalKindness(post.kindnessEarned);
  }, [post.kindnessEarned]);

  useEffect(() => {
    if (!isPostOwner) {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/feed/${post.id}/my-kindness`, baseUrl);
      fetch(url.toString(), { credentials: 'include' })
        .then((r) => r.json())
        .then((data: any) => {
          if (typeof data.delta === 'number') setMyPostDelta(data.delta);
        })
        .catch(() => {});
    }
  }, [post.id, isPostOwner]);

  const { data: comments } = useQuery<CommentData[]>({
    queryKey: ['/api/feed', post.id, 'comments'],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/feed/${post.id}/comments`, baseUrl);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showComments,
  });

  useEffect(() => {
    if (isPostOwner && comments && comments.length > 0) {
      const baseUrl = getApiUrl();
      comments.forEach((c) => {
        const url = new URL(`/api/feed/comments/${c.id}/my-kindness`, baseUrl);
        fetch(url.toString(), { credentials: 'include' })
          .then((r) => r.json())
          .then((data: any) => {
            if (typeof data.delta === 'number' && data.delta !== 0) {
              setCommentDeltas((prev) => ({ ...prev, [c.id]: data.delta }));
            }
          })
          .catch(() => {});
      });
    }
  }, [comments, isPostOwner]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/feed/${post.id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      if (!isPostOwner) {
        setKindnessToast('+5 Kindness');
        setTimeout(() => setKindnessToast(''), 2000);
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest('POST', `/api/feed/${post.id}/comment`, { text });
      return res.json();
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['/api/feed', post.id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
    },
  });

  const postKindnessMutation = useMutation({
    mutationFn: async (delta: number) => {
      setPostKindnessInFlight(true);
      const res = await apiRequest('POST', `/api/feed/${post.id}/kindness`, { delta });
      return res.json();
    },
    onMutate: (delta: number) => {
      const prevKindness = localKindness;
      const prevDelta = myPostDelta;
      setLocalKindness((prev) => prev + delta);
      setMyPostDelta((prev) => prev + delta);
      return { prevKindness, prevDelta };
    },
    onSuccess: (data: any) => {
      if (typeof data.userDelta === 'number') {
        setMyPostDelta(data.userDelta);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kindness/history'] });
    },
    onError: (err: any, _delta: number, context: any) => {
      if (context) {
        setLocalKindness(context.prevKindness);
        setMyPostDelta(context.prevDelta);
      }
      const msg = err?.message || 'Kindness limit reached';
      setKindnessToast(msg);
      setTimeout(() => setKindnessToast(''), 2500);
    },
    onSettled: () => {
      setPostKindnessInFlight(false);
    },
  });

  const commentKindnessMutation = useMutation({
    mutationFn: async ({ commentId, delta }: { commentId: string; delta: number }) => {
      setCommentKindnessInFlight((prev) => ({ ...prev, [commentId]: true }));
      const res = await apiRequest('POST', `/api/feed/comments/${commentId}/kindness`, { delta });
      return res.json();
    },
    onMutate: (variables: { commentId: string; delta: number }) => {
      const prevDelta = commentDeltas[variables.commentId] || 0;
      const prevScoreOffset = commentScoreOffsets[variables.commentId] || 0;
      setCommentDeltas((prev) => ({ ...prev, [variables.commentId]: prevDelta + variables.delta }));
      setCommentScoreOffsets((prev) => ({ ...prev, [variables.commentId]: prevScoreOffset + variables.delta }));
      return { prevDelta, prevScoreOffset, commentId: variables.commentId };
    },
    onSuccess: (data: any, variables: { commentId: string; delta: number }) => {
      if (typeof data.userDelta === 'number') {
        setCommentDeltas((prev) => ({ ...prev, [variables.commentId]: data.userDelta }));
      }
      setCommentScoreOffsets((prev) => ({ ...prev, [variables.commentId]: 0 }));
      queryClient.invalidateQueries({ queryKey: ['/api/feed', post.id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kindness/history'] });
    },
    onError: (err: any, variables: { commentId: string; delta: number }, context: any) => {
      if (context) {
        setCommentDeltas((prev) => ({ ...prev, [context.commentId]: context.prevDelta }));
        setCommentScoreOffsets((prev) => ({ ...prev, [context.commentId]: context.prevScoreOffset }));
      }
      const msg = err?.message || 'Kindness limit reached';
      setKindnessToast(msg);
      setTimeout(() => setKindnessToast(''), 2500);
    },
    onSettled: (_data: any, _err: any, variables: { commentId: string; delta: number }) => {
      setCommentKindnessInFlight((prev) => ({ ...prev, [variables.commentId]: false }));
    },
  });

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!liked) {
      setLiked(true);
      likeMutation.mutate();
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    commentMutation.mutate(commentText.trim());
  };

  const handleCommentKindness = (commentId: string, delta: number) => {
    if (commentKindnessInFlight[commentId]) return;
    commentKindnessMutation.mutate({ commentId, delta });
  };

  const commentsList = comments || [];
  const postAtMax = myPostDelta >= 10;
  const postAtMin = myPostDelta <= -10;

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
        <View style={[styles.kindnessEarned, { backgroundColor: kindnessBg(localKindness) }]}>
          <Ionicons name="heart" size={14} color={kindnessColor(localKindness)} />
          <Text style={[styles.kindnessText, { color: kindnessColor(localKindness) }]}>{kindnessLabel(localKindness)}</Text>
        </View>
        {!isPostOwner && (
          <View style={styles.kindnessAwardRow}>
            <Pressable
              style={[styles.kindnessAwardBtn, postAtMax && { opacity: 0.3 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                postKindnessMutation.mutate(10);
              }}
              disabled={postAtMax || postKindnessInFlight}
            >
              <Text style={styles.kindnessAwardPlus}>+10</Text>
            </Pressable>
            <Pressable
              style={[styles.kindnessAwardBtn, postAtMin && { opacity: 0.3 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                postKindnessMutation.mutate(-10);
              }}
              disabled={postAtMin || postKindnessInFlight}
            >
              <Text style={styles.kindnessAwardMinus}>-10</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={handleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? Colors.dark.kindnessGreen : Colors.dark.textMuted} />
          <Text style={[styles.actionText, liked && { color: Colors.dark.kindnessGreen }]}>{post.likes + (liked ? 1 : 0)}</Text>
        </Pressable>
        {!!kindnessToast && (
          <View style={styles.kindnessToast}>
            <Text style={styles.kindnessToastText}>{kindnessToast}</Text>
          </View>
        )}
        <Pressable style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
          <Ionicons name={showComments ? 'chatbubble' : 'chatbubble-outline'} size={18} color={showComments ? Colors.dark.accentBlue : Colors.dark.textMuted} />
          <Text style={[styles.actionText, showComments && { color: Colors.dark.accentBlue }]}>{post.comments}</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color={Colors.dark.textMuted} />
        </Pressable>
      </View>

      {showComments && (
        <View style={styles.commentsSection}>
          {commentsList.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              isPostOwner={isPostOwner}
              onAwardKindness={handleCommentKindness}
              commentDeltas={commentDeltas}
              commentScoreOffsets={commentScoreOffsets}
            />
          ))}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.dark.textMuted}
              maxLength={500}
              testID={`comment-input-${post.id}`}
            />
            <Pressable
              style={[styles.commentSendBtn, !commentText.trim() && { opacity: 0.4 }]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || commentMutation.isPending}
              testID={`comment-send-${post.id}`}
            >
              <Ionicons name="send" size={16} color={Colors.dark.accentBlue} />
            </Pressable>
          </View>
        </View>
      )}
    </GlassCard>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [feedTab, setFeedTab] = useState<'buddy' | 'nearby'>('buddy');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const cacheKey = `feed_${feedTab}`;

  const { data: posts, isLoading, isFetching, refetch } = useQuery<FeedPostData[]>({
    queryKey: ['/api/feed', feedTab],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL('/api/feed', baseUrl);
      url.searchParams.set('type', feedTab);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      cacheSet(cacheKey, data);
      return data;
    },
    placeholderData: () => {
      return undefined;
    },
  });

  const [cachedPosts, setCachedPosts] = useState<FeedPostData[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cacheGet<FeedPostData[]>(cacheKey).then((cached) => {
      if (cached) setCachedPosts(cached);
    });
  }, [cacheKey]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => {
      setRefreshing(false);
    });
  }, [refetch]);

  const feedPosts = posts || cachedPosts || [];
  const currentUserId = user?.id || '';

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerTop}>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, feedTab === 'buddy' && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFeedTab('buddy');
              }}
            >
              <Text style={[styles.toggleText, feedTab === 'buddy' && styles.toggleTextActive]}>Buddy List</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, feedTab === 'nearby' && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFeedTab('nearby');
              }}
            >
              <Text style={[styles.toggleText, feedTab === 'nearby' && styles.toggleTextActive]}>Nearby 400m</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.createPostBtn}
            onPress={() => router.push('/create-post')}
            testID="create-post-button"
          >
            <Ionicons name="add" size={22} color={Colors.dark.accentBlue} />
          </Pressable>
        </View>
      </View>

      {isLoading && !cachedPosts ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.dark.accentBlue} />
        </View>
      ) : (
        <FlatList
          data={feedPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedPostItem post={item} currentUserId={currentUserId} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={feedPosts.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.accentBlue}
              colors={[Colors.dark.accentBlue]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  headerContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  createPostBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', backgroundColor: Colors.dark.surfaceElevated, borderRadius: 12, padding: 3 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  toggleBtnActive: { backgroundColor: Colors.dark.accentBlue },
  toggleText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  toggleTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 100 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  postCard: { gap: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postInfo: { flex: 1 },
  postUsername: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  postTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  postContent: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.text, lineHeight: 20 },
  mediaPreview: { height: 120, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kindnessEarned: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  kindnessText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  kindnessAwardRow: { flexDirection: 'row', gap: 6 },
  kindnessAwardBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.dark.surfaceElevated },
  kindnessAwardPlus: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentGreen },
  kindnessAwardMinus: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.offlineRed },
  actionRow: { flexDirection: 'row', gap: 20, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.dark.separator, alignItems: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  actionText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  kindnessToast: { backgroundColor: Colors.dark.accentGreenDim, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  kindnessToastText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.dark.kindnessGreen },
  commentsSection: { borderTopWidth: 1, borderTopColor: Colors.dark.separator, paddingTop: 8, gap: 8 },
  commentRow: { flexDirection: 'row', gap: 8 },
  commentContent: { flex: 1, gap: 2 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentUsername: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  commentTime: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  commentText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.text, lineHeight: 18 },
  commentFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  commentKindnessBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  commentKindnessText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  commentKindnessActions: { flexDirection: 'row', gap: 4 },
  miniKindnessBtn: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: Colors.dark.surfaceElevated },
  miniKindnessPlus: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentGreen },
  miniKindnessMinus: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.dark.offlineRed },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  commentInput: { flex: 1, backgroundColor: Colors.dark.inputBackground, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.text, borderWidth: 1, borderColor: Colors.dark.glassBorder },
  commentSendBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
});
