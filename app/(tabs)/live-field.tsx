import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';
import { fetch } from 'expo/fetch';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = SCREEN_WIDTH - 64;

interface NearbyUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  distance: number;
  rawDistance: number;
  interests: string[];
  angle: number;
  kindnessScore: number;
  isOnline: boolean;
}

export default function LiveFieldScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [feedMode, setFeedMode] = useState<'buddy' | 'nearby'>('nearby');
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const updatePresenceMutation = useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) => {
      await apiRequest('POST', '/api/nearby/update', coords);
    },
  });

  useEffect(() => {
    if (!user) return;

    async function requestLocation() {
      if (Platform.OS === 'web') {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocationStatus('granted');
              updatePresenceMutation.mutate({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            },
            () => {
              setLocationStatus('denied');
            },
          );
        } else {
          setLocationStatus('denied');
        }
      } else {
        try {
          const Location = await import('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            setLocationStatus('granted');
            const loc = await Location.getCurrentPositionAsync({});
            updatePresenceMutation.mutate({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          } else {
            setLocationStatus('denied');
          }
        } catch {
          setLocationStatus('denied');
        }
      }
    }

    requestLocation();
  }, [user?.id]);

  const { data: nearbyUsers, isLoading } = useQuery<NearbyUser[]>({
    queryKey: ['/api/nearby', feedMode],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL('/api/nearby', baseUrl);
      url.searchParams.set('type', feedMode);
      url.searchParams.set('radius', '400');
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const users = nearbyUsers || [];

  const toggleFeed = (mode: 'buddy' | 'nearby') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedMode(mode);
  };

  const countLabel = feedMode === 'buddy'
    ? `${users.length} ${users.length === 1 ? 'buddy' : 'buddies'} nearby`
    : `${users.length} ${users.length === 1 ? 'person' : 'people'} nearby`;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Ionicons name="person-circle-outline" size={28} color={Colors.dark.textSecondary} />
        <Text style={styles.headerTitle}>Live Field</Text>
        <View style={styles.gpsIndicator}>
          <Ionicons
            name={locationStatus === 'granted' ? 'location' : 'location-outline'}
            size={18}
            color={locationStatus === 'granted' ? Colors.dark.accentGreen : Colors.dark.textMuted}
          />
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, feedMode === 'buddy' && styles.toggleActive]}
          onPress={() => toggleFeed('buddy')}
        >
          <Text style={[styles.toggleText, feedMode === 'buddy' && styles.toggleTextActive]}>Buddy Feed</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, feedMode === 'nearby' && styles.toggleActive]}
          onPress={() => toggleFeed('nearby')}
        >
          <Text style={[styles.toggleText, feedMode === 'nearby' && styles.toggleTextActive]}>Nearby Feed</Text>
        </Pressable>
      </View>

      <View style={styles.radarContainer}>
        {isLoading ? (
          <ActivityIndicator color={Colors.dark.accentGreen} />
        ) : (
          <View style={[styles.radarOuter, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
            <View style={styles.radarRing3} />
            <View style={styles.radarRing2} />
            <View style={styles.radarRing1} />
            <View style={styles.radarCenter}>
              <View style={styles.radarCenterDot} />
            </View>

            {users.map((u) => {
              const maxRadius = RADAR_SIZE / 2 - 30;
              const normalizedDist = Math.min(u.distance / 400, 1);
              const r = normalizedDist * maxRadius;
              const rad = (u.angle * Math.PI) / 180;
              const x = Math.cos(rad) * r;
              const y = Math.sin(rad) * r;

              return (
                <View
                  key={u.id}
                  style={[
                    styles.radarUser,
                    {
                      left: RADAR_SIZE / 2 + x - 24,
                      top: RADAR_SIZE / 2 + y - 24,
                    },
                  ]}
                >
                  <Avatar
                    name={u.displayName || u.username}
                    size={36}
                    showGlow={u.isOnline}
                    glowColor={u.isOnline ? Colors.dark.onlineGreen : 'transparent'}
                  />
                  <Text style={styles.radarDistance}>{u.rawDistance || u.distance}m</Text>
                  {u.interests.slice(0, 2).map((interest) => (
                    <View key={interest} style={styles.interestChip}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.radiusLabel}>Radius: 400m</Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}>
        <Pressable
          style={styles.nearbyCountCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/nearby-list', params: { type: feedMode } });
          }}
          testID="nearby-count-bar"
        >
          <Ionicons name="radio" size={18} color={Colors.dark.accentGreen} />
          <Text style={styles.nearbyCountText}>{countLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  gpsIndicator: { width: 28, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: Colors.dark.surfaceElevated, borderRadius: 12, padding: 3 },
  toggleButton: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.dark.accentBlue },
  toggleText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  toggleTextActive: { color: '#FFFFFF' },
  radarContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  radarOuter: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  radarRing3: { position: 'absolute', width: '100%', height: '100%', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(0,255,136,0.08)' },
  radarRing2: { position: 'absolute', width: '66%', height: '66%', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(0,255,136,0.12)' },
  radarRing1: { position: 'absolute', width: '33%', height: '33%', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(0,255,136,0.18)' },
  radarCenter: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,255,136,0.3)', alignItems: 'center', justifyContent: 'center' },
  radarCenterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.accentGreen },
  radarUser: { position: 'absolute', alignItems: 'center', gap: 2 },
  radarDistance: { fontSize: 9, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  interestChip: { backgroundColor: 'rgba(0,170,255,0.15)', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
  interestText: { fontSize: 8, fontFamily: 'Inter_500Medium', color: Colors.dark.accentBlue },
  radiusLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, marginTop: 8 },
  bottomBar: { paddingHorizontal: 20 },
  nearbyCountCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dark.surfaceElevated, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.dark.glassBorder },
  nearbyCountText: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
});
