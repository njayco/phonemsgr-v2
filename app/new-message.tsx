import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Platform, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/GlassCard';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';
import { fetch } from 'expo/fetch';

interface SearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isOnline: boolean;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function NewMessageScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const { data: results, isLoading, isFetching } = useQuery<SearchResult[]>({
    queryKey: ['/api/users/search', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length === 0) return [];
      const baseUrl = getApiUrl();
      const url = new URL('/api/users/search', baseUrl);
      url.searchParams.set('q', debouncedQuery.trim());
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const createThreadMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const res = await apiRequest('POST', '/api/threads', { participantId });
      return res.json();
    },
    onSuccess: (data: { threadId: string }, participantId: string) => {
      const user = (results || []).find(u => u.id === participantId);
      router.replace({
        pathname: '/chat/[id]',
        params: { id: data.threadId, name: user?.displayName || 'Chat', participantId: participantId },
      });
    },
  });

  const handleSelect = useCallback((user: SearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createThreadMutation.mutate(user.id);
  }, [results]);

  const searchResults = results || [];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} testID="new-message-back">
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.dark.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, @username, or phone..."
          placeholderTextColor={Colors.dark.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          testID="user-search-input"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.dark.textMuted} />
          </Pressable>
        )}
      </View>

      {(isLoading || isFetching) && query.length > 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.dark.accentBlue} />
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.7 }]}
              onPress={() => handleSelect(item)}
              testID={`search-result-${item.id}`}
            >
              <Avatar
                name={item.displayName || item.username}
                size={44}
                showGlow={item.isOnline}
                glowColor={Colors.dark.onlineGreen}
              />
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.displayName}</Text>
                <Text style={styles.resultUsername}>@{item.username}</Text>
              </View>
              <View style={[styles.statusChip, { borderColor: item.isOnline ? Colors.dark.onlineGreen : Colors.dark.textMuted }]}>
                <View style={[styles.statusDot, { backgroundColor: item.isOnline ? Colors.dark.onlineGreen : Colors.dark.textMuted }]} />
                <Text style={[styles.statusText, { color: item.isOnline ? Colors.dark.onlineGreen : Colors.dark.textMuted }]}>
                  {item.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={searchResults.length > 0}
          ListEmptyComponent={
            query.length > 0 && !isLoading && !isFetching ? (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={48} color={Colors.dark.textMuted} />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            ) : query.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={Colors.dark.textMuted} />
                <Text style={styles.emptyText}>Search for people to message</Text>
              </View>
            ) : null
          }
        />
      )}

      {createThreadMutation.isPending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.dark.accentBlue} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, backgroundColor: Colors.dark.inputBackground, borderRadius: 12, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  listContent: { paddingBottom: 100 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  resultInfo: { flex: 1, gap: 2 },
  resultName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  resultUsername: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.dark.overlay, alignItems: 'center', justifyContent: 'center' },
});
