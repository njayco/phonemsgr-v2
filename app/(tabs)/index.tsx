import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/GlassCard';
import { useAuth } from '@/lib/auth-context';
import { NEARBY_USERS, RECENT_ACTIVITY } from '@/lib/mock-data';
import Colors from '@/constants/colors';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  if (!user) return null;

  const planLabel = user.plan === 'executive' ? 'Executive' : user.plan === 'associate' ? 'Associate' : 'Temp';
  const planColor = user.plan === 'executive' ? Colors.dark.accentGreen : user.plan === 'associate' ? Colors.dark.accentBlue : Colors.dark.textSecondary;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Phone Msgr 2026</Text>
            <Text style={styles.welcomeText}>Welcome, {user.displayName || user.username}</Text>
          </View>
          <Pressable onPress={() => router.push('/settings')} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={22} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>

        <GlassCard style={styles.statusCard} borderColor={planColor}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.planBadge, { backgroundColor: planColor + '20', borderColor: planColor }]}>
                <Text style={[styles.planText, { color: planColor }]}>{planLabel}</Text>
              </View>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: user.isOnline ? Colors.dark.onlineGreen : Colors.dark.offlineRed }]} />
                <Text style={styles.onlineText}>{user.isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
            <View style={styles.kindnessPreview}>
              <Ionicons name="heart" size={20} color={Colors.dark.kindnessGreen} />
              <Text style={styles.kindnessValue}>{user.kindnessScore.toLocaleString()}</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.quickActions}>
          <Pressable style={styles.quickAction} onPress={() => router.push('/(tabs)/messages')}>
            <View style={[styles.quickIcon, { backgroundColor: Colors.dark.accentBlueDim }]}>
              <Ionicons name="chatbubble" size={20} color={Colors.dark.accentBlue} />
            </View>
            <Text style={styles.quickLabel}>Messages</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push('/(tabs)/live-field')}>
            <View style={[styles.quickIcon, { backgroundColor: Colors.dark.accentGreenDim }]}>
              <Ionicons name="locate" size={20} color={Colors.dark.accentGreen} />
            </View>
            <Text style={styles.quickLabel}>Nearby</Text>
            <Text style={styles.quickCount}>{NEARBY_USERS.length}</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push('/monetization')}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(0,229,255,0.1)' }]}>
              <MaterialCommunityIcons name="chart-line" size={20} color={Colors.dark.accentCyan} />
            </View>
            <Text style={styles.quickLabel}>Revenue</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push('/offline')}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(255,184,0,0.1)' }]}>
              <Ionicons name="cloud-offline" size={20} color={Colors.dark.warning} />
            </View>
            <Text style={styles.quickLabel}>Mesh</Text>
          </Pressable>
        </View>

        <GlassCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kindness Score</Text>
            <Ionicons name="heart" size={16} color={Colors.dark.kindnessGreen} />
          </View>
          <Text style={styles.bigScore}>{user.kindnessScore.toLocaleString()}</Text>
          <Text style={styles.scoreLabel}>Lifetime Kindness Score</Text>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={[Colors.dark.accentBlue, Colors.dark.accentGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${(user.reputationLevel / 10) * 100}%` }]}
            />
          </View>
          <Text style={styles.repText}>Reputation Level {user.reputationLevel}/10</Text>
        </GlassCard>

        <GlassCard>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {RECENT_ACTIVITY.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityBadge}>
                <Text style={styles.activityPoints}>+{item.points}</Text>
              </View>
              <Text style={styles.activityDesc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.activityTime}>{item.timeAgo}</Text>
            </View>
          ))}
        </GlassCard>

        {user.plan === 'executive' && (
          <Pressable onPress={() => router.push('/monetization')}>
            <GlassCard borderColor={Colors.dark.accentCyan}>
              <View style={styles.revenueRow}>
                <View>
                  <Text style={styles.revenueLabel}>Monthly Revenue</Text>
                  <Text style={styles.revenueValue}>${user.monthlyRevenue.toLocaleString()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.dark.accentCyan} />
              </View>
            </GlassCard>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  greeting: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted, letterSpacing: 1 },
  welcomeText: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.dark.text, marginTop: 4 },
  settingsButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  statusCard: { paddingVertical: 14 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { gap: 8 },
  planBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  planText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  kindnessPreview: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindnessValue: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, backgroundColor: Colors.dark.glassBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.glassBorder, padding: 12, alignItems: 'center', gap: 8 },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary },
  quickCount: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.dark.accentGreen },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  bigScore: { fontSize: 40, fontFamily: 'Inter_700Bold', color: Colors.dark.text, marginBottom: 4 },
  scoreLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginBottom: 12 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  repText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary, marginTop: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.dark.separator, gap: 10 },
  activityBadge: { backgroundColor: Colors.dark.accentGreenDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  activityPoints: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentGreen },
  activityDesc: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  activityTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  revenueValue: { fontSize: 24, fontFamily: 'Inter_700Bold', color: Colors.dark.accentCyan, marginTop: 2 },
});
