import { View, Text, ScrollView, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/GlassCard';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';

function timeAgo(ts: number | string): string {
  const time = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Date.now() - time;
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return `${Math.floor(diff / 604800000)}w ago`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const { data: activity } = useQuery<any[]>({
    queryKey: ['/api/kindness/history'],
    enabled: !!user,
  });

  if (!user) return null;

  const recentActivity = activity || [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerLabel}>Phone Msgr 2026</Text>
          <Pressable onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={22} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarGlow}>
            <Avatar name={user.displayName || user.username} size={80} />
          </View>
          <Text style={styles.username}>@{user.username}</Text>
        </View>

        <GlassCard borderColor={Colors.dark.accentGreen}>
          <View style={styles.scoreRow}>
            <Ionicons name="heart" size={24} color={Colors.dark.kindnessGreen} />
            <Text style={styles.scoreValue}>{user.kindnessScore.toLocaleString()}</Text>
          </View>
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

        <View style={styles.badgeRow}>
          {(user.badges || []).map((badge) => {
            const iconMap: Record<string, string> = {
              'Top Contributor': 'arrow-up-circle',
              'Verified Helper': 'shield-checkmark',
              'Community Leader': 'people',
            };
            return (
              <View key={badge} style={styles.badgeItem}>
                <View style={styles.badgeIcon}>
                  <Ionicons name={(iconMap[badge] || 'star') as any} size={20} color={Colors.dark.accentBlue} />
                </View>
                <Text style={styles.badgeLabel}>{badge}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.connections}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.messagesCount >= 1000 ? `${(user.messagesCount / 1000).toFixed(1)}K` : user.messagesCount}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.eventsCount}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
        </View>

        <GlassCard>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentActivity.length === 0 && (
            <Text style={styles.emptyText}>No activity yet</Text>
          )}
          {recentActivity.map((item: any) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityBadge}>
                <Text style={styles.activityPoints}>+{item.points}</Text>
              </View>
              <Text style={styles.activityDesc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.activityTime}>{timeAgo(item.createdAt)}</Text>
            </View>
          ))}
        </GlassCard>

        <View style={styles.actionButtons}>
          <Pressable style={styles.upgradeButton} onPress={() => router.push('/pricing')}>
            <MaterialCommunityIcons name="crown" size={18} color={Colors.dark.warning} />
            <Text style={styles.upgradeText}>Upgrade Plan</Text>
          </Pressable>
          <Pressable style={styles.signOutButton} onPress={async () => { await signOut(); router.replace('/'); }}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted, letterSpacing: 1 },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatarGlow: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2,
    borderColor: Colors.dark.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  username: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  scoreValue: { fontSize: 36, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  scoreLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginBottom: 12 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  repText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary, marginTop: 8 },
  badgeRow: { flexDirection: 'row', gap: 10 },
  badgeItem: { flex: 1, backgroundColor: Colors.dark.glassBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.glassBorder, padding: 12, alignItems: 'center', gap: 6 },
  badgeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.accentBlueDim, alignItems: 'center', justifyContent: 'center' },
  badgeLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.dark.glassBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.glassBorder, padding: 16 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  statDivider: { width: 1, backgroundColor: Colors.dark.separator },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, marginBottom: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.dark.separator, gap: 10 },
  activityBadge: { backgroundColor: Colors.dark.accentGreenDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  activityPoints: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentGreen },
  activityDesc: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  activityTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, textAlign: 'center', paddingVertical: 12 },
  actionButtons: { gap: 10 },
  upgradeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,184,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', borderRadius: 14, paddingVertical: 14 },
  upgradeText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.warning },
  signOutButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)' },
  signOutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.offlineRed },
});
