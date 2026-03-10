import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, Platform, KeyboardAvoidingView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth-context';
import { cacheGet, cacheSet } from '@/lib/local-cache';
import { sendTyping, sendMessageRead, onWsEvent, offWsEvent } from '@/lib/websocket';
import Colors from '@/constants/colors';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  isDeliveredViaMesh: boolean;
  status?: 'sent' | 'delivered' | 'read';
  isDeleted?: boolean;
  deliveredAt?: string | null;
  readAt?: string | null;
  _optimistic?: boolean;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ReceiptIcon({ status }: { status?: string }) {
  if (!status || status === 'sent') {
    return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.4)" />;
  }
  if (status === 'delivered') {
    return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.4)" />;
  }
  if (status === 'read') {
    return <Ionicons name="checkmark-done" size={14} color="#4FC3F7" />;
  }
  return null;
}

function MessageBubble({ message, isOwn, onLongPress }: { message: Message; isOwn: boolean; onLongPress?: () => void }) {
  const isRedacted = message.isDeleted;

  return (
    <Pressable
      onLongPress={isOwn && !isRedacted ? onLongPress : undefined}
      style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}
    >
      <View style={[
        styles.bubble,
        isOwn ? styles.bubbleOwn : styles.bubbleOther,
        isRedacted && styles.bubbleRedacted,
        message._optimistic && { opacity: 0.7 },
      ]}>
        {isRedacted ? (
          <View style={styles.redactedContent}>
            <Ionicons name="lock-closed" size={12} color="#FF6B6B" />
            <Text style={styles.redactedText}>REDACTED</Text>
          </View>
        ) : (
          <Text style={styles.bubbleText}>{message.text}</Text>
        )}
        <View style={styles.bubbleMeta}>
          <Text style={styles.bubbleTime}>
            {isRedacted ? 'CLASSIFIED' : formatTime(message.createdAt)}
          </Text>
          {message.isDeliveredViaMesh && !isRedacted && (
            <View style={styles.meshBadge}>
              <Ionicons name="git-network" size={9} color={Colors.dark.accentGreen} />
              <Text style={styles.meshText}>Local Relay</Text>
            </View>
          )}
          {isOwn && !isRedacted && <ReceiptIcon status={message.status} />}
        </View>
      </View>
    </Pressable>
  );
}

function TypingBubble({ text, name }: { text: string; name: string }) {
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowOther]}>
      <View style={styles.typingRow}>
        <Avatar name={name} size={20} />
        <View style={[styles.bubble, styles.bubbleOther, styles.typingBubble]}>
          <Text style={styles.typingText}>{text || '...'}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, name, participantId } = useLocalSearchParams<{ id: string; name: string; participantId: string }>();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const [typingText, setTypingText] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatCacheKey = `chat_${id}`;
  const [cachedMessages, setCachedMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    if (id) {
      cacheGet<Message[]>(chatCacheKey).then((cached) => {
        if (cached) setCachedMessages(cached);
      });
    }
  }, [id, chatCacheKey]);

  useEffect(() => {
    if (id) {
      sendMessageRead(id);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const handleTyping = (data: any) => {
      if (data.threadId === id && data.userId !== user?.id) {
        setTypingText(data.text || '');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingText(''), 3000);
      }
    };

    const handleNewMessage = (data: any) => {
      if (data.threadId === id) {
        setTypingText('');
        sendMessageRead(id);
      }
    };

    onWsEvent('typing', handleTyping);
    onWsEvent('new_message', handleNewMessage);

    return () => {
      offWsEvent('typing', handleTyping);
      offWsEvent('new_message', handleNewMessage);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, user?.id]);

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['/api/threads', id, 'messages'],
    refetchInterval: 10000,
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
    onMutate: async (text: string) => {
      await queryClient.cancelQueries({ queryKey: ['/api/threads', id, 'messages'] });
      const previous = queryClient.getQueryData<Message[]>(['/api/threads', id, 'messages']);

      const tempMsg: Message = {
        id: 'temp-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text,
        senderId: user?.id || '',
        createdAt: new Date().toISOString(),
        isDeliveredViaMesh: false,
        status: 'sent',
        _optimistic: true,
      };

      queryClient.setQueryData<Message[]>(
        ['/api/threads', id, 'messages'],
        (old) => [...(old || []), tempMsg],
      );

      return { previous };
    },
    onError: (_err, _text, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['/api/threads', id, 'messages'], context.previous);
      }
    },
    onSuccess: (serverMsg) => {
      queryClient.setQueryData<Message[]>(
        ['/api/threads', id, 'messages'],
        (old) => {
          if (!old) return [serverMsg];
          const filtered = old.filter((m) => !m._optimistic);
          return [...filtered, serverMsg];
        },
      );
      queryClient.invalidateQueries({ queryKey: ['/api/threads'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest('DELETE', `/api/threads/${id}/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/threads', id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/threads'] });
    },
  });

  const handleDeleteMessage = useCallback((messageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Message',
      'This message will be permanently redacted for all participants.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'REDACT',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(messageId),
        },
      ],
    );
  }, [deleteMutation]);

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = inputText.trim();
    setInputText('');
    sendMutation.mutate(text);
  }, [inputText, sendMutation]);

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    if (id) {
      sendTyping(id, text);
    }
  }, [id]);

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
        <Pressable onPress={() => participantId && router.push(`/profile/${participantId}`)}>
          <Avatar name={name || 'User'} size={32} showGlow glowColor={Colors.dark.onlineGreen} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Pressable onPress={() => participantId && router.push(`/profile/${participantId}`)}>
            <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
          </Pressable>
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
            <MessageBubble
              message={item}
              isOwn={item.senderId === user?.id}
              onLongPress={() => handleDeleteMessage(item.id)}
            />
          )}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            typingText !== '' ? (
              <TypingBubble text={typingText} name={name || 'User'} />
            ) : null
          }
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
            onChangeText={handleTextChange}
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
  bubbleRedacted: { backgroundColor: 'rgba(180, 40, 40, 0.35)', borderWidth: 1, borderColor: 'rgba(255, 80, 80, 0.3)' },
  bubbleText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: '#FFFFFF', lineHeight: 21 },
  redactedContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  redactedText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FF6B6B', letterSpacing: 2 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  bubbleTime: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' },
  meshBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meshText: { fontSize: 9, fontFamily: 'Inter_500Medium', color: Colors.dark.accentGreen },
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  typingBubble: { opacity: 0.6, borderStyle: 'dashed' as any },
  typingText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.dark.separator, gap: 6 },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  inputWrapper: { flex: 1, backgroundColor: Colors.dark.inputBackground, borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.glassBorder, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100 },
  input: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.text, maxHeight: 80 },
  beamButton: { backgroundColor: Colors.dark.accentBlue, borderRadius: 18, paddingHorizontal: 16, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  beamText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1 },
});
