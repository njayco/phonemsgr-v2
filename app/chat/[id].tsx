import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, Animated, Modal, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { GifPicker, type GifResult } from '@/components/GifPicker';
import { DirectToTalk } from '@/components/DirectToTalk';
import { ImageViewer } from '@/components/ImageViewer';
import { apiRequest, queryClient, getApiUrl } from '@/lib/query-client';
import { uploadFile, type PickedFile } from '@/lib/upload-file';
import { useAuth } from '@/lib/auth-context';
import { cacheGet, cacheSet } from '@/lib/local-cache';
import { sendTyping, sendMessageRead, sendNudge, onWsEvent, offWsEvent } from '@/lib/websocket';
import Colors from '@/constants/colors';
import { Accelerometer } from 'expo-sensors';

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
  mediaType?: 'image' | 'gif' | null;
  mediaUrl?: string | null;
  isViewOnce?: boolean;
  viewedAt?: string | null;
  _optimistic?: boolean;
}

function resolveMediaUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return new URL(url, getApiUrl()).toString();
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

function ViewOnceContent({ message, isOwn, threadId }: { message: Message; isOwn: boolean; threadId: string }) {
  const [openedUrl, setOpenedUrl] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const alreadyViewed = !!message.viewedAt;

  const handleOpen = async () => {
    if (isOwn || opening) return;
    if (alreadyViewed && !openedUrl) return;
    if (openedUrl) {
      setViewerVisible(true);
      return;
    }
    setOpening(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest('POST', `/api/threads/${threadId}/messages/${message.id}/open`);
      const data = await res.json();
      if (data.mediaUrl) {
        setOpenedUrl(resolveMediaUrl(data.mediaUrl));
        setViewerVisible(true);
        queryClient.invalidateQueries({ queryKey: ['/api/threads', threadId, 'messages'] });
      }
    } catch {
      queryClient.invalidateQueries({ queryKey: ['/api/threads', threadId, 'messages'] });
    } finally {
      setOpening(false);
    }
  };

  if (isOwn) {
    return (
      <View style={styles.viewOnceRow}>
        <View style={styles.viewOnceIconWrap}>
          <Ionicons name={alreadyViewed ? 'checkmark-done' : 'time-outline'} size={16} color={Colors.dark.accentCyan} />
        </View>
        <View>
          <Text style={styles.viewOnceLabel}>View Once Photo</Text>
          <Text style={styles.viewOnceSub}>{alreadyViewed ? 'Opened' : 'Not opened yet'}</Text>
        </View>
      </View>
    );
  }

  const expired = alreadyViewed && !openedUrl;

  return (
    <>
      <Pressable style={styles.viewOnceRow} onPress={handleOpen} disabled={expired} testID={`view-once-${message.id}`}>
        <View style={[styles.viewOnceIconWrap, expired && { opacity: 0.5 }]}>
          {opening ? (
            <ActivityIndicator size="small" color={Colors.dark.accentCyan} />
          ) : (
            <Ionicons name={expired ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.dark.accentCyan} />
          )}
        </View>
        <View>
          <Text style={styles.viewOnceLabel}>View Once Photo</Text>
          <Text style={styles.viewOnceSub}>{expired ? 'No longer available' : 'Tap to view — one time only'}</Text>
        </View>
      </Pressable>
      {openedUrl && (
        <ImageViewer
          visible={viewerVisible}
          images={[openedUrl]}
          onClose={() => {
            setViewerVisible(false);
            setOpenedUrl(null);
            queryClient.invalidateQueries({ queryKey: ['/api/threads', threadId, 'messages'] });
          }}
        />
      )}
    </>
  );
}

function MediaBubbleContent({ message }: { message: Message }) {
  const [viewerVisible, setViewerVisible] = useState(false);
  if (!message.mediaUrl) return null;
  const fullUrl = resolveMediaUrl(message.mediaUrl);
  const isGif = message.mediaType === 'gif';

  return (
    <>
      <Pressable onPress={() => setViewerVisible(true)} testID={`media-message-${message.id}`}>
        <Image
          source={{ uri: fullUrl }}
          style={isGif ? styles.gifMedia : styles.imageMedia}
          contentFit="cover"
        />
        {isGif && (
          <View style={styles.gifBadge}>
            <Text style={styles.gifBadgeText}>GIF</Text>
          </View>
        )}
      </Pressable>
      <ImageViewer visible={viewerVisible} images={[fullUrl]} onClose={() => setViewerVisible(false)} />
    </>
  );
}

function MessageBubble({ message, isOwn, onLongPress, threadId }: { message: Message; isOwn: boolean; onLongPress?: () => void; threadId: string }) {
  const isRedacted = message.isDeleted;
  const hasMedia = !!message.mediaType && !isRedacted;

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
          <>
            {hasMedia && message.isViewOnce ? (
              <ViewOnceContent message={message} isOwn={isOwn} threadId={threadId} />
            ) : hasMedia ? (
              <MediaBubbleContent message={message} />
            ) : null}
            {!!message.text && <Text style={[styles.bubbleText, hasMedia && { marginTop: 6 }]}>{message.text}</Text>}
          </>
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
          {isOwn && !isRedacted && message.isViewOnce && message.viewedAt ? (
            <Text style={styles.openedLabel}>Viewed</Text>
          ) : null}
          {isOwn && !isRedacted && <ReceiptIcon status={message.status} />}
        </View>
      </View>
    </Pressable>
  );
}

function TypingBubble({ text, name, avatarUrl }: { text: string; name: string; avatarUrl?: string }) {
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowOther]}>
      <View style={styles.typingRow}>
        <Avatar name={name} size={20} imageUrl={avatarUrl} />
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
  const { id, name, participantId, avatarUrl: participantAvatarUrl } = useLocalSearchParams<{ id: string; name: string; participantId: string; avatarUrl?: string }>();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const [typingText, setTypingText] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<PickedFile[]>([]);
  const [captionText, setCaptionText] = useState('');
  const [viewOnce, setViewOnce] = useState(false);
  const [sendingPhotos, setSendingPhotos] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [nudgeReceived, setNudgeReceived] = useState(false);
  const [dttActive, setDttActive] = useState(false);
  const nudgeCooldownRef = useRef(false);
  const nudgeFlashAnim = useRef(new Animated.Value(0)).current;

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

    const handleOpened = (data: any) => {
      if (data.threadId === id) {
        queryClient.invalidateQueries({ queryKey: ['/api/threads', id, 'messages'] });
      }
    };

    // Peer activated Direct to Talk in this thread — join them automatically
    const handleDttInvite = (data: any) => {
      if (data.threadId === id) {
        setDttActive(true);
      }
    };

    onWsEvent('typing', handleTyping);
    onWsEvent('new_message', handleNewMessage);
    onWsEvent('message_opened', handleOpened);
    onWsEvent('dtt_invite', handleDttInvite);

    return () => {
      offWsEvent('typing', handleTyping);
      offWsEvent('new_message', handleNewMessage);
      offWsEvent('message_opened', handleOpened);
      offWsEvent('dtt_invite', handleDttInvite);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web' || !id) return;

    let lastShakeTime = 0;
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const totalForce = Math.sqrt(x * x + y * y + z * z);
      if (totalForce > 2.5) {
        const now = Date.now();
        if (now - lastShakeTime > 3000 && !nudgeCooldownRef.current) {
          lastShakeTime = now;
          nudgeCooldownRef.current = true;
          sendNudge(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setNudgeSent(true);
          setTimeout(() => setNudgeSent(false), 2000);
          setTimeout(() => { nudgeCooldownRef.current = false; }, 3000);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const handleNudge = (data: any) => {
      if (data.threadId === id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setNudgeReceived(true);
        Animated.sequence([
          Animated.timing(nudgeFlashAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
          Animated.timing(nudgeFlashAnim, { toValue: 0, duration: 100, useNativeDriver: false }),
          Animated.timing(nudgeFlashAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
          Animated.timing(nudgeFlashAnim, { toValue: 0, duration: 100, useNativeDriver: false }),
          Animated.timing(nudgeFlashAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
          Animated.timing(nudgeFlashAnim, { toValue: 0, duration: 100, useNativeDriver: false }),
        ]).start();
        setTimeout(() => setNudgeReceived(false), 2000);
      }
    };

    onWsEvent('nudge_received', handleNudge);
    return () => { offWsEvent('nudge_received', handleNudge); };
  }, [id, nudgeFlashAnim]);

  const nudgeFlashBg = nudgeFlashAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['rgba(0,0,0,0)', '#00FF88', '#FF4444'],
  });

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
    mutationFn: async (payload: { text: string; mediaType?: string; mediaUrl?: string; isViewOnce?: boolean }) => {
      const res = await apiRequest('POST', `/api/threads/${id}/messages`, payload);
      return res.json();
    },
    onMutate: async (payload: { text: string; mediaType?: string; mediaUrl?: string; isViewOnce?: boolean }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/threads', id, 'messages'] });
      const previous = queryClient.getQueryData<Message[]>(['/api/threads', id, 'messages']);

      const tempMsg: Message = {
        id: 'temp-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: payload.text,
        senderId: user?.id || '',
        createdAt: new Date().toISOString(),
        isDeliveredViaMesh: false,
        status: 'sent',
        mediaType: (payload.mediaType as any) || null,
        mediaUrl: payload.mediaUrl || null,
        isViewOnce: payload.isViewOnce || false,
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
    if (!inputText.trim() && !selectedGif) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = inputText.trim();
    setInputText('');
    if (selectedGif) {
      const gif = selectedGif;
      setSelectedGif(null);
      sendMutation.mutate({ text, mediaType: 'gif', mediaUrl: gif.url });
    } else {
      sendMutation.mutate({ text });
    }
  }, [inputText, selectedGif, sendMutation]);

  const pickFromLibrary = useCallback(async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (result.canceled) return;
    const picked: PickedFile[] = result.assets.map((a, i) => ({
      uri: a.uri,
      name: a.fileName || `photo_${Date.now()}_${i}.jpg`,
      type: a.mimeType || 'image/jpeg',
    }));
    setPendingPhotos(picked);
    setCaptionText('');
    setViewOnce(false);
  }, []);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera', 'Camera permission is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    const a = result.assets[0];
    setPendingPhotos([{
      uri: a.uri,
      name: a.fileName || `photo_${Date.now()}.jpg`,
      type: a.mimeType || 'image/jpeg',
    }]);
    setCaptionText('');
    setViewOnce(false);
  }, []);

  const handleAttach = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      pickFromLibrary();
      return;
    }
    Alert.alert('Attach Photo', undefined, [
      { text: 'Photo Library', onPress: pickFromLibrary },
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickFromLibrary, takePhoto]);

  const sendPhotos = useCallback(async () => {
    if (pendingPhotos.length === 0 || sendingPhotos) return;
    setSendingPhotos(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const caption = captionText.trim();
      for (let i = 0; i < pendingPhotos.length; i++) {
        const url = await uploadFile(pendingPhotos[i]);
        await sendMutation.mutateAsync({
          text: i === 0 ? caption : '',
          mediaType: 'image',
          mediaUrl: url,
          isViewOnce: viewOnce,
        });
      }
      setPendingPhotos([]);
      setCaptionText('');
      setViewOnce(false);
    } catch {
      Alert.alert('Send failed', 'Could not send photo. Please try again.');
    } finally {
      setSendingPhotos(false);
    }
  }, [pendingPhotos, captionText, viewOnce, sendingPhotos, sendMutation]);

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
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: nudgeFlashBg, zIndex: 100, opacity: nudgeFlashAnim }]} />

      {nudgeSent && (
        <View style={[styles.nudgeBanner, { top: topInset + 52 }]}>
          <Ionicons name="hand-left" size={14} color={Colors.dark.accentGreen} />
          <Text style={styles.nudgeBannerText}>Nudge sent!</Text>
        </View>
      )}

      {nudgeReceived && (
        <View style={[styles.nudgeBanner, styles.nudgeReceivedBanner, { top: topInset + 52 }]}>
          <Ionicons name="hand-left" size={14} color="#FF4444" />
          <Text style={[styles.nudgeBannerText, { color: '#FF4444' }]}>{name || 'User'} nudged you!</Text>
        </View>
      )}

      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Pressable onPress={() => participantId && router.push(`/profile/${participantId}`)}>
          <Avatar name={name || 'User'} size={32} showGlow glowColor={Colors.dark.onlineGreen} imageUrl={participantAvatarUrl || undefined} />
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
        <Pressable
          style={styles.moreBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDttActive(true);
          }}
          testID="dtt-activate"
        >
          <Ionicons name="radio" size={22} color={dttActive ? Colors.dark.accentCyan : Colors.dark.textSecondary} />
        </Pressable>
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
              threadId={id || ''}
            />
          )}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            typingText !== '' ? (
              <TypingBubble text={typingText} name={name || 'User'} avatarUrl={participantAvatarUrl || undefined} />
            ) : null
          }
        />
      )}

      {selectedGif && (
        <View style={styles.gifChipRow}>
          <Image source={{ uri: selectedGif.previewUrl }} style={styles.gifChipImage} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.gifChipLabel}>GIF attached</Text>
            <Text style={styles.gifChipSub} numberOfLines={1}>{selectedGif.title || 'Will send with your message'}</Text>
          </View>
          <Pressable onPress={() => setSelectedGif(null)} testID="remove-gif">
            <Ionicons name="close-circle" size={22} color={Colors.dark.textMuted} />
          </Pressable>
        </View>
      )}

      <View style={[styles.inputContainer, { paddingBottom: bottomInset + 8 }]}>
        <Pressable style={styles.attachBtn} onPress={handleAttach} testID="attach-button">
          <Ionicons name="add-circle" size={28} color={Colors.dark.accentBlue} />
        </Pressable>
        <Pressable
          style={styles.attachBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setGifPickerVisible(true);
          }}
          testID="gif-button"
        >
          <Ionicons name="happy-outline" size={26} color={Colors.dark.accentCyan} />
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
          style={[styles.beamButton, !inputText.trim() && !selectedGif && { opacity: 0.4 }]}
          onPress={sendMessage}
          disabled={(!inputText.trim() && !selectedGif) || sendMutation.isPending}
          testID="beam-send-button"
        >
          <Text style={styles.beamText}>BEAM</Text>
        </Pressable>
      </View>

      {dttActive && id && user?.id && (
        <DirectToTalk
          threadId={id}
          peerName={name || 'Contact'}
          userId={user.id}
          onClose={() => setDttActive(false)}
        />
      )}

      <GifPicker
        visible={gifPickerVisible}
        onClose={() => setGifPickerVisible(false)}
        onSelect={(gif) => {
          setSelectedGif(gif);
          setGifPickerVisible(false);
        }}
      />

      <Modal visible={pendingPhotos.length > 0} transparent animationType="slide" onRequestClose={() => !sendingPhotos && setPendingPhotos([])}>
        <View style={styles.previewBackdrop}>
          <View style={styles.previewSheet}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>
                {pendingPhotos.length === 1 ? 'Send Photo' : `Send ${pendingPhotos.length} Photos`}
              </Text>
              <Pressable onPress={() => !sendingPhotos && setPendingPhotos([])} testID="photo-preview-close">
                <Ionicons name="close" size={24} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewStrip}>
              {pendingPhotos.map((p, i) => (
                <View key={`${p.uri}-${i}`}>
                  <Image source={{ uri: p.uri }} style={styles.previewImage} contentFit="cover" />
                  {pendingPhotos.length > 1 && (
                    <Pressable
                      style={styles.previewRemove}
                      onPress={() => setPendingPhotos((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>

            <TextInput
              style={styles.captionInput}
              value={captionText}
              onChangeText={setCaptionText}
              placeholder="Add a caption (optional)..."
              placeholderTextColor={Colors.dark.textMuted}
              maxLength={500}
              testID="caption-input"
            />

            <View style={styles.privacyOptions}>
              <Pressable
                style={[styles.privacyOption, !viewOnce && styles.privacyOptionActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewOnce(false); }}
                testID="leave-in-chat-option"
              >
                <Ionicons name="chatbubbles-outline" size={18} color={!viewOnce ? Colors.dark.accentBlue : Colors.dark.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.privacyLabel, !viewOnce && { color: Colors.dark.accentBlue }]}>Leave in Chat</Text>
                  <Text style={styles.privacySub}>Photo stays visible in the conversation</Text>
                </View>
                {!viewOnce && <Ionicons name="checkmark-circle" size={18} color={Colors.dark.accentBlue} />}
              </Pressable>
              <Pressable
                style={[styles.privacyOption, viewOnce && styles.privacyOptionActiveCyan]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewOnce(true); }}
                testID="view-once-option"
              >
                <Ionicons name="eye-outline" size={18} color={viewOnce ? Colors.dark.accentCyan : Colors.dark.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.privacyLabel, viewOnce && { color: Colors.dark.accentCyan }]}>View Once</Text>
                  <Text style={styles.privacySub}>Recipient can open the photo one time only</Text>
                </View>
                {viewOnce && <Ionicons name="checkmark-circle" size={18} color={Colors.dark.accentCyan} />}
              </Pressable>
            </View>

            <Pressable
              style={[styles.previewSendBtn, sendingPhotos && { opacity: 0.6 }]}
              onPress={sendPhotos}
              disabled={sendingPhotos}
              testID="send-photos-button"
            >
              {sendingPhotos ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.previewSendText}>{sendingPhotos ? 'Sending...' : 'BEAM'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  nudgeBanner: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.accentGreen,
  },
  nudgeReceivedBanner: {
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderBottomColor: '#FF4444',
  },
  nudgeBannerText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentGreen },
  imageMedia: { width: 220, height: 220, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  gifMedia: { width: 220, height: 160, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  gifBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  gifBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1 },
  openedLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentCyan },
  viewOnceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingRight: 8, minWidth: 180 },
  viewOnceIconWrap: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.dark.accentCyan, alignItems: 'center', justifyContent: 'center' },
  viewOnceLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  viewOnceSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  gifChipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.dark.separator, backgroundColor: Colors.dark.surfaceElevated },
  gifChipImage: { width: 44, height: 44, borderRadius: 8 },
  gifChipLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentCyan },
  gifChipSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  previewSheet: { backgroundColor: Colors.dark.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: Colors.dark.glassBorder, padding: 16, paddingBottom: Platform.OS === 'web' ? 24 : 40, gap: 14 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  previewStrip: { gap: 10 },
  previewImage: { width: 140, height: 140, borderRadius: 12, backgroundColor: Colors.dark.surfaceElevated },
  previewRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  captionInput: { backgroundColor: Colors.dark.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.glassBorder, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  privacyOptions: { gap: 8 },
  privacyOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.dark.surfaceElevated, borderWidth: 1, borderColor: 'transparent' },
  privacyOptionActive: { borderColor: Colors.dark.accentBlue },
  privacyOptionActiveCyan: { borderColor: Colors.dark.accentCyan },
  privacyLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  privacySub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  previewSendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.dark.accentBlue, borderRadius: 14, paddingVertical: 13 },
  previewSendText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1 },
});
