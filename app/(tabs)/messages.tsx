import { View, Text, FlatList, StyleSheet, Pressable, Platform, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { cacheGet, cacheSet } from '@/lib/local-cache';
import { onWsEvent, offWsEvent } from '@/lib/websocket';
import { queryClient } from '@/lib/query-client';
import Colors from '@/constants/colors';

interface ChatThread {
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

function timeLabel(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function ChatRow({ thread }: { thread: ChatThread }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chatRow, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/chat/[id]', params: { id: thread.id, name: thread.participantName, participantId: thread.participantId } });
      }}
      testID={`chat-thread-${thread.id}`}
    >
      <Pressable style={styles.avatarContainer} onPress={(e) => { e.stopPropagation(); router.push(`/profile/${thread.participantId}`); }}>
        <Avatar name={thread.participantName} size={48} showGlow={thread.isOnline} glowColor={Colors.dark.onlineGreen} />
      </Pressable>
      <View style={styles.chatInfo}>
        <View style={styles.chatTopRow}>
          <Pressable onPress={(e) => { e.stopPropagation(); router.push(`/profile/${thread.participantId}`); }}>
            <Text style={styles.chatName} numberOfLines={1}>{thread.participantName}</Text>
          </Pressable>
          <Text style={styles.chatTime}>{timeLabel(thread.lastMessageTime)}</Text>
        </View>
        <View style={styles.chatBottomRow}>
          <Text style={styles.chatPreview} numberOfLines={1}>{thread.lastMessage}</Text>
          {thread.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{thread.unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.chipRow}>
          {thread.isEncrypted && (
            <View style={styles.encryptedChip}>
              <Ionicons name="lock-closed" size={9} color={Colors.dark.accentBlue} />
              <Text style={styles.chipText}>E2E</Text>
            </View>
          )}
          <View style={[styles.modeChip, { borderColor: thread.isOnline ? Colors.dark.onlineGreen : Colors.dark.textMuted }]}>
            <Text style={[styles.chipText, { color: thread.isOnline ? Colors.dark.onlineGreen : Colors.dark.textMuted }]}>
              {thread.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const [cachedThreads, setCachedThreads] = useState<ChatThread[] | null>(null);

  useEffect(() => {
    cacheGet<ChatThread[]>('threads').then((cached) => {
      if (cached) setCachedThreads(cached);
    });
  }, []);

  const { data: threads, isLoading } = useQuery<ChatThread[]>({
    queryKey: ['/api/threads'],
  });

  useEffect(() => {
    if (threads) {
      cacheSet('threads', threads);
    }
  }, [threads]);

  useEffect(() => {
    const refreshThreads = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/threads'] });
    };
    onWsEvent('new_message', refreshThreads);
    onWsEvent('messages_read', refreshThreads);
    return () => {
      offWsEvent('new_message', refreshThreads);
      offWsEvent('messages_read', refreshThreads);
    };
  }, []);

  const allThreads = threads || cachedThreads || [];
  const filtered = search
    ? allThreads.filter(t => t.participantName.toLowerCase().includes(search.toLowerCase()))
    : allThreads;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable style={styles.composeButton} onPress={() => router.push('/new-message')} testID="compose-message">
          <Ionicons name="create-outline" size={22} color={Colors.dark.accentBlue} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.dark.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor={Colors.dark.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading && !cachedThreads ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.dark.accentBlue} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatRow thread={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={filtered.length > 0}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  composeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, backgroundColor: Colors.dark.inputBackground, borderRadius: 12, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  listContent: { paddingBottom: 100 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  chatRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatarContainer: { justifyContent: 'center' },
  chatInfo: { flex: 1, gap: 4 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, flex: 1 },
  chatTime: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, marginLeft: 8 },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatPreview: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, flex: 1 },
  unreadBadge: { backgroundColor: Colors.dark.accentBlue, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 },
  unreadText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  encryptedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.dark.accentBlueDim, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  modeChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  chipText: { fontSize: 9, fontFamily: 'Inter_500Medium', color: Colors.dark.accentBlue },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
});
