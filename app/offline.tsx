import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/GlassCard';
import Colors from '@/constants/colors';

export default function OfflineScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0F', '#0A1A15', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
      </View>

      <View style={[styles.content, { paddingBottom: bottomInset + 20 }]}>
        <View style={styles.statusSection}>
          <Text style={styles.statusLabel}>Internet Connection Lost</Text>
          <Text style={styles.statusSub}>Connection Lost</Text>
        </View>

        <View style={styles.meshIconContainer}>
          <View style={styles.meshIconOuter}>
            <View style={styles.meshIconInner}>
              <MaterialCommunityIcons name="access-point-network" size={64} color={Colors.dark.accentGreen} />
            </View>
          </View>
        </View>

        <Text style={styles.meshTitle}>Mesh Mode Active</Text>
        <Text style={styles.meshDesc}>Your messages will route{'\n'}through nearby devices</Text>

        <GlassCard style={styles.relayCard} borderColor={Colors.dark.accentGreen}>
          <View style={styles.relayRow}>
            <Text style={styles.relayText}>3 nearby relays available</Text>
          </View>
        </GlassCard>

        <View style={styles.rangeRow}>
          <Ionicons name="radio" size={18} color={Colors.dark.accentGreen} />
          <Text style={styles.rangeText}>Range: 400m</Text>
          <View style={styles.signalBars}>
            <View style={[styles.bar, styles.barActive, { height: 6 }]} />
            <View style={[styles.bar, styles.barActive, { height: 10 }]} />
            <View style={[styles.bar, styles.barActive, { height: 14 }]} />
            <View style={[styles.bar, { height: 18 }]} />
          </View>
        </View>

        <GlassCard style={styles.queueCard}>
          <Text style={styles.queueTitle}>Message Queue</Text>
          <View style={styles.queueItem}>
            <Ionicons name="time" size={16} color={Colors.dark.warning} />
            <Text style={styles.queueText}>2 messages pending delivery</Text>
          </View>
          <View style={styles.queueItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.dark.accentGreen} />
            <Text style={styles.queueText}>5 messages delivered via relay</Text>
          </View>
        </GlassCard>

        <Pressable style={styles.upgradeButton} onPress={() => router.push('/pricing')}>
          <MaterialCommunityIcons name="shield-lock" size={18} color={Colors.dark.warning} />
          <Text style={styles.upgradeText}>Upgrade Resilience Plan</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  statusSection: { alignItems: 'center', gap: 4 },
  statusLabel: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  statusSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  meshIconContainer: { marginVertical: 8 },
  meshIconOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meshIconInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0,255,136,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meshTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.dark.accentGreen },
  meshDesc: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, textAlign: 'center', lineHeight: 22 },
  relayCard: { width: '100%', paddingVertical: 14 },
  relayRow: { alignItems: 'center' },
  relayText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentGreen },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.dark.text },
  signalBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.15)', height: 14 },
  barActive: { backgroundColor: Colors.dark.accentGreen },
  queueCard: { width: '100%', gap: 10 },
  queueTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  queueItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  queueText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  upgradeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  upgradeText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.warning },
});
