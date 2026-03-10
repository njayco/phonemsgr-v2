import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth-context';
import { cacheGet, cacheSet } from '@/lib/local-cache';
import Colors from '@/constants/colors';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  isDeliveredViaMesh: boolean;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={styles.bubbleText}>{message.text}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={styles.bubbleTime}>{formatTime(message.createdAt)}</Text>
          {message.isDeliveredViaMesh && (
            <View style={styles.meshBadge}>
              <Ionicons name="git-network" size={9} color={Colors.dark.accentGreen} />
              <Text style={styles.meshText}>Local Relay</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const chatCacheKey = `chat_${id}`;
  const [cachedMessages, setCachedMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    if (id) {
      cacheGet<Message[]>(chatCacheKey).then((cached) => {
        if (cached) setCachedMessages(cached);
      });
    }
  }, [id, chatCacheKey]);

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['/api/threads', id, 'messages'],
    refetchInterval: 5000,
    enabled: !!id,
  });

  useEffect(() => {
    if (messages) {
      cacheSet(chatCacheKey, messages);
    }
  }, [messages, chatCacheKey]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest('POST', `/api/threads/${id}/messages`, { text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/threads', id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/threads'] });
    },
  });

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = inputText.trim();
    setInputText('');
    sendMutation.mutate(text);
  }, [inputText, sendMutation]);

  const allMessages = messages || cachedMessages || [];
  const reversedMessages = [...allMessages].reverse();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Avatar name={name || 'User'} size={32} showGlow glowColor={Colors.dark.onlineGreen} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
          <View style={styles.headerChips}>
            <View style={styles.onlineChip}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineLabel}>Online Mode</Text>
            </View>
            <View style={styles.e2eChip}>
              <Text style={styles.e2eText}>E2E</Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.moreBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.headerBorder} />

      {isLoading && !cachedMessages ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.dark.accentBlue} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.senderId === user?.id} />
          )}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.inputContainer, { paddingBottom: bottomInset + 8 }]}>
        <Pressable style={styles.attachBtn}>
          <Ionicons name="add-circle" size={28} color={Colors.dark.textMuted} />
        </Pressable>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type encrypted message..."
            placeholderTextColor={Colors.dark.textMuted}
            multiline
            maxLength={1000}
            testID="chat-input"
          />
        </View>
        <Pressable
          style={[styles.beamButton, !inputText.trim() && { opacity: 0.4 }]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sendMutation.isPending}
          testID="beam-send-button"
        >
          <Text style={styles.beamText}>BEAM</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  headerChips: { flexDirection: 'row', gap: 6 },
  onlineChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.dark.onlineGreen },
  onlineLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: Colors.dark.onlineGreen },
  e2eChip: { backgroundColor: Colors.dark.accentBlueDim, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  e2eText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentBlue },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerBorder: { height: 1, backgroundColor: Colors.dark.accentGreen, shadowColor: Colors.dark.accentGreen, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  bubbleRow: { marginBottom: 2 },
  bubbleRowOwn: { alignItems: 'flex-end' },
  bubbleRowOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 10, paddingBottom: 6 },
  bubbleOwn: { backgroundColor: Colors.dark.bubbleOutgoing, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.dark.bubbleIncoming, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: '#FFFFFF', lineHeight: 21 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  bubbleTime: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' },
  meshBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meshText: { fontSize: 9, fontFamily: 'Inter_500Medium', color: Colors.dark.accentGreen },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.dark.separator, gap: 6 },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  inputWrapper: { flex: 1, backgroundColor: Colors.dark.inputBackground, borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.glassBorder, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100 },
  input: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.text, maxHeight: 80 },
  beamButton: { backgroundColor: Colors.dark.accentBlue, borderRadius: 18, paddingHorizontal: 16, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  beamText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1 },
});
