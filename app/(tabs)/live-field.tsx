import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { NEARBY_USERS } from '@/lib/mock-data';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = SCREEN_WIDTH - 64;

export default function LiveFieldScreen() {
  const insets = useSafeAreaInsets();
  const [feedMode, setFeedMode] = useState<'buddy' | 'nearby'>('nearby');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const toggleFeed = (mode: 'buddy' | 'nearby') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedMode(mode);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Ionicons name="person-circle-outline" size={28} color={Colors.dark.textSecondary} />
        <Text style={styles.headerTitle}>Live Field</Text>
        <Ionicons name="people-outline" size={24} color={Colors.dark.textSecondary} />
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
        <View style={[styles.radarOuter, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
          <View style={styles.radarRing3} />
          <View style={styles.radarRing2} />
          <View style={styles.radarRing1} />
          <View style={styles.radarCenter}>
            <View style={styles.radarCenterDot} />
          </View>

          {NEARBY_USERS.map((user) => {
            const maxRadius = RADAR_SIZE / 2 - 30;
            const normalizedDist = Math.min(user.distance / 400, 1);
            const r = normalizedDist * maxRadius;
            const rad = (user.angle * Math.PI) / 180;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;

            return (
              <View
                key={user.id}
                style={[
                  styles.radarUser,
                  {
                    left: RADAR_SIZE / 2 + x - 24,
                    top: RADAR_SIZE / 2 + y - 24,
                  },
                ]}
              >
                <Avatar name={user.username} size={36} showGlow glowColor={Colors.dark.accentGreen} />
                <Text style={styles.radarDistance}>{user.distance}m</Text>
                <View style={styles.radarInterests}>
                  {user.interests.slice(0, 2).map((interest) => (
                    <View key={interest} style={styles.interestChip}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.radiusLabel}>Radius: 400m</Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}>
        <View style={styles.nearbyCountCard}>
          <Ionicons name="radio" size={18} color={Colors.dark.accentGreen} />
          <Text style={styles.nearbyCountText}>{NEARBY_USERS.length} people nearby</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
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
  radarInterests: { flexDirection: 'row', gap: 2 },
  interestChip: { backgroundColor: 'rgba(0,170,255,0.15)', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
  interestText: { fontSize: 8, fontFamily: 'Inter_500Medium', color: Colors.dark.accentBlue },
  radiusLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, marginTop: 8 },
  bottomBar: { paddingHorizontal: 20 },
  nearbyCountCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dark.surfaceElevated, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.dark.glassBorder },
  nearbyCountText: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
});
