import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { sendDtt, onWsEvent, offWsEvent } from '@/lib/websocket';
import { playRadioTone, requestMicPermission, SegmentRecorder, PlaybackQueue } from '@/lib/dtt-audio';
import Colors from '@/constants/colors';

type DttStatus = 'connecting' | 'ready' | 'talking' | 'listen' | 'offline' | 'ended';

const STATUS_META: Record<DttStatus, { label: string; color: string; sub: string }> = {
  connecting: { label: 'CONNECTING', color: '#FFB74D', sub: 'Establishing voice connection...' },
  ready: { label: 'READY', color: Colors.dark.accentGreen ?? '#00FF88', sub: 'Hold TALK to transmit' },
  talking: { label: 'TALKING', color: '#4FC3F7', sub: 'Transmitting — release to stop' },
  listen: { label: 'LISTEN', color: '#FF6B6B', sub: 'Incoming transmission' },
  offline: { label: 'OFFLINE', color: '#9E9E9E', sub: 'Contact is unavailable right now' },
  ended: { label: 'ENDED', color: '#9E9E9E', sub: 'Direct to Talk session ended' },
};

export function DirectToTalk({
  threadId,
  peerName,
  userId,
  onClose,
}: {
  threadId: string;
  peerName: string;
  userId: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<DttStatus>('connecting');
  const statusRef = useRef<DttStatus>('connecting');
  const recorderRef = useRef<SegmentRecorder | null>(null);
  const playbackRef = useRef<PlaybackQueue | null>(null);
  const seqRef = useRef(0);
  const holdingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const setStatusSafe = useCallback((s: DttStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Pulse animation while talking/listening
  useEffect(() => {
    pulseLoopRef.current?.stop();
    if (status === 'talking' || status === 'listen') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseLoopRef.current = loop;
      loop.start();
    } else {
      pulseAnim.setValue(0);
    }
    return () => {
      pulseLoopRef.current?.stop();
    };
  }, [status, pulseAnim]);

  useEffect(() => {
    playbackRef.current = new PlaybackQueue();

    const handleState = (data: any) => {
      if (data.threadId !== threadId) return;
      if (!data.peerOnline && (!data.participants || data.participants.length < 2)) {
        setStatusSafe('offline');
      } else if (data.speakerId && data.speakerId !== userId) {
        setStatusSafe('listen');
      } else {
        setStatusSafe('ready');
        playRadioTone();
      }
    };

    const handlePeerJoined = (data: any) => {
      if (data.threadId !== threadId) return;
      if (statusRef.current === 'offline' || statusRef.current === 'connecting') {
        setStatusSafe('ready');
        playRadioTone();
      }
    };

    // Server confirmed we hold the channel (sent directly to us on
    // acquisition; dtt_talk_start with our id is an equivalent backup).
    const handleGranted = (data: any) => {
      if (data.threadId !== threadId) return;
      if (holdingRef.current && statusRef.current !== 'talking') {
        setStatusSafe('talking');
        playRadioTone();
        startRecording();
      }
    };

    const handleTalkStart = (data: any) => {
      if (data.threadId !== threadId) return;
      if (data.userId === userId) {
        handleGranted(data);
      } else {
        setStatusSafe('listen');
        playRadioTone();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    };

    const handleTalkEnd = (data: any) => {
      if (data.threadId !== threadId) return;
      if (statusRef.current === 'listen' || (data.userId === userId && statusRef.current === 'talking')) {
        setStatusSafe('ready');
      }
    };

    const handleAudio = (data: any) => {
      if (data.threadId !== threadId || data.userId === userId) return;
      if (typeof data.data === 'string') {
        playbackRef.current?.enqueue(data.data);
      }
    };

    const handleDenied = (data: any) => {
      if (data.threadId !== threadId) return;
      holdingRef.current = false;
      setStatusSafe('listen');
    };

    const handlePeerLeft = (data: any) => {
      if (data.threadId !== threadId) return;
      playbackRef.current?.clear();
      setStatusSafe('offline');
    };

    // Fired every time the socket (re)authenticates — covers both
    // "overlay opened before the socket was ready" and mid-session
    // reconnects (the server dropped our membership on disconnect).
    const handleConnected = () => {
      holdingRef.current = false;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        recorder.discardTail = true; // socket changed — the drain window belongs to the old connection
        recorder.stop().catch(() => {});
      }
      playbackRef.current?.clear();
      setStatusSafe('connecting');
      sendDtt({ type: 'dtt_join', threadId });
    };

    onWsEvent('dtt_state', handleState);
    onWsEvent('dtt_peer_joined', handlePeerJoined);
    onWsEvent('dtt_talk_granted', handleGranted);
    onWsEvent('dtt_talk_start', handleTalkStart);
    onWsEvent('dtt_talk_end', handleTalkEnd);
    onWsEvent('dtt_audio', handleAudio);
    onWsEvent('dtt_denied', handleDenied);
    onWsEvent('dtt_peer_left', handlePeerLeft);
    onWsEvent('connected', handleConnected);

    // Join the session now if the socket is ready; otherwise the
    // 'connected' handler above joins as soon as it authenticates.
    sendDtt({ type: 'dtt_join', threadId });

    return () => {
      offWsEvent('dtt_state', handleState);
      offWsEvent('dtt_peer_joined', handlePeerJoined);
      offWsEvent('dtt_talk_granted', handleGranted);
      offWsEvent('dtt_talk_start', handleTalkStart);
      offWsEvent('dtt_talk_end', handleTalkEnd);
      offWsEvent('dtt_audio', handleAudio);
      offWsEvent('dtt_denied', handleDenied);
      offWsEvent('dtt_peer_left', handlePeerLeft);
      offWsEvent('connected', handleConnected);
      if (recorderRef.current) {
        recorderRef.current.discardTail = true;
        recorderRef.current.stop();
        recorderRef.current = null;
      }
      playbackRef.current?.destroy();
      playbackRef.current = null;
      sendDtt({ type: 'dtt_leave', threadId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, userId]);

  const startRecording = useCallback(() => {
    if (recorderRef.current) return;
    const recorder = new SegmentRecorder((dataUri) => {
      sendDtt({ type: 'dtt_audio', threadId, seq: seqRef.current++, data: dataUri });
    });
    recorderRef.current = recorder;
    recorder.start().catch(() => {
      recorderRef.current = null;
    });
  }, [threadId]);

  const handleTalkPressIn = useCallback(async () => {
    if (statusRef.current !== 'ready' || holdingRef.current) return;
    // Mark the physical press BEFORE awaiting permission so a quick
    // release during the permission prompt cancels the claim cleanly.
    holdingRef.current = true;
    const granted = await requestMicPermission();
    if (!granted) {
      holdingRef.current = false;
      Alert.alert('Microphone', 'Microphone permission is needed for Direct to Talk.');
      return;
    }
    if (!holdingRef.current) return; // released while permission prompt was up
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    sendDtt({ type: 'dtt_talk_start', threadId });
  }, [threadId]);

  const handleTalkPressOut = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    // Release the channel IMMEDIATELY — never wait on recorder teardown
    // or base64 conversion. The server ignores this if we never actually
    // held the channel, and WS ordering guarantees it lands after any
    // in-flight dtt_talk_start.
    sendDtt({ type: 'dtt_talk_end', threadId });
    if (statusRef.current === 'talking') setStatusSafe('ready');
    const recorder = recorderRef.current;
    recorderRef.current = null;
    recorder?.stop().catch(() => {});
  }, [threadId, setStatusSafe]);

  const handleEnd = useCallback(() => {
    // Free the channel and leave the session right away; the brief ENDED
    // state is purely visual.
    holdingRef.current = false;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.discardTail = true; // ending the session — drop the in-flight tail
      recorder.stop().catch(() => {});
    }
    sendDtt({ type: 'dtt_talk_end', threadId });
    sendDtt({ type: 'dtt_leave', threadId });
    setStatusSafe('ended');
    setTimeout(onClose, 600);
  }, [onClose, setStatusSafe, threadId]);

  const meta = STATUS_META[status];
  const talkDisabled = status !== 'ready' && status !== 'talking';
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.overlay} testID="dtt-overlay">
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="radio" size={18} color={Colors.dark.accentCyan} />
          <Text style={styles.headerTitle}>DIRECT TO TALK</Text>
        </View>
        <Pressable onPress={handleEnd} style={styles.endBtn} testID="dtt-end">
          <Ionicons name="close" size={18} color="#FF6B6B" />
          <Text style={styles.endText}>END</Text>
        </Pressable>
      </View>

      <Text style={styles.peerName}>{peerName}</Text>

      <View style={[styles.statusBadge, { borderColor: meta.color }]} testID="dtt-status">
        <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
        <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <Text style={styles.statusSub}>{meta.sub}</Text>

      <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
        <Pressable
          onPressIn={handleTalkPressIn}
          onPressOut={handleTalkPressOut}
          disabled={talkDisabled}
          style={[
            styles.talkButton,
            status === 'talking' && styles.talkButtonActive,
            status === 'listen' && styles.talkButtonListen,
            talkDisabled && status !== 'listen' && { opacity: 0.4 },
          ]}
          testID="dtt-talk-button"
        >
          <Ionicons
            name={status === 'listen' ? 'volume-high' : 'mic'}
            size={40}
            color={status === 'talking' ? '#0A0F14' : '#FFFFFF'}
          />
          <Text style={[styles.talkText, status === 'talking' && { color: '#0A0F14' }]}>
            {status === 'listen' ? 'LISTEN' : status === 'talking' ? 'ON AIR' : 'TALK'}
          </Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.hint}>
        {status === 'offline'
          ? `${peerName} cannot receive transmissions right now`
          : 'Hold to talk • Release to listen'}
      </Text>
      {Platform.OS !== 'web' && (
        <Text style={styles.hardwareNote}>
          Power-button push-to-talk is not supported by this device OS — use the on-screen TALK button.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(6, 10, 16, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    paddingHorizontal: 24,
  },
  headerRow: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    color: Colors.dark.accentCyan,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  endText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  peerName: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  statusSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 40 },
  talkButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(79,195,247,0.15)',
    borderWidth: 3,
    borderColor: '#4FC3F7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  talkButtonActive: {
    backgroundColor: '#4FC3F7',
    borderColor: '#FFFFFF',
  },
  talkButtonListen: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderColor: '#FF6B6B',
  },
  talkText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 32 },
  hardwareNote: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
