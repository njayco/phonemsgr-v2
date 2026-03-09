import { View, Text, FlatList, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/GlassCard';
import { apiRequest, getApiUrl, queryClient } from '@/lib/query-client';
import Colors from '@/constants/colors';
import { fetch } from 'expo/fetch';

interface NearbyPerson {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  distance: number;
  rawDistance: number;
  angle: number;
  kindnessScore: number;
  isOnline: boolean;
  interests: string[];
}

function NearbyPersonRow({ person, showAddBuddy }: { person: NearbyPerson; showAddBuddy: boolean }) {
  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/threads', { participantId: person.id });
      return res.json();
    },
    onSuccess: (data: { threadId: string }) => {
      router.push({
        pathname: '/chat/[id]',
        params: { id: data.threadId, name: person.displayName || person.username },
      });
    },
  });

  const addBuddyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/buddies/${person.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buddies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nearby'] });
    },
  });

  return (
    <GlassCard style={styles.personCard}>
      <View style={styles.personTop}>
        <Avatar
          name={person.displayName || person.username}
          size={44}
          showGlow={person.isOnline}
          glowColor={Colors.dark.onlineGreen}
        />
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{person.displayName || person.username}</Text>
          <Text style={styles.personUsername}>@{person.username}</Text>
        </View>
        <View style={styles.personMeta}>
          <Text style={styles.distanceText}>{person.rawDistance}m</Text>
          <View style={[styles.statusChip, { borderColor: person.isOnline ? Colors.dark.onlineGreen : Colors.dark.textMuted }]}>
            <View style={[styles.statusDot, { backgroundColor: person.isOnline ? Colors.dark.onlineGreen : Colors.dark.textMuted }]} />
            <Text style={[styles.statusChipText, { color: person.isOnline ? Colors.dark.onlineGreen : Colors.dark.textMuted }]}>
              {person.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {person.interests.length > 0 && (
        <View style={styles.interestRow}>
          {person.interests.slice(0, 4).map((interest) => (
            <View key={interest} style={styles.interestChip}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            createThreadMutation.mutate();
          }}
          testID={`message-${person.id}`}
        >
          <Ionicons name="chatbubble-outline" size={16} color={Colors.dark.accentBlue} />
          <Text style={styles.actionBtnText}>Message</Text>
        </Pressable>
        {showAddBuddy && (
          <Pressable
            style={[styles.actionBtn, styles.addBuddyBtn]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              addBuddyMutation.mutate();
            }}
            disabled={addBuddyMutation.isPending || addBuddyMutation.isSuccess}
            testID={`add-buddy-${person.id}`}
          >
            <Ionicons
              name={addBuddyMutation.isSuccess ? 'checkmark' : 'person-add-outline'}
              size={16}
              color={addBuddyMutation.isSuccess ? Colors.dark.accentGreen : Colors.dark.accentGreen}
            />
            <Text style={[styles.actionBtnText, { color: Colors.dark.accentGreen }]}>
              {addBuddyMutation.isSuccess ? 'Added' : 'Add Buddy'}
            </Text>
          </Pressable>
        )}
      </View>
    </GlassCard>
  );
}

export default function NearbyListScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type: string }>();
  const viewType = params.type || 'nearby';
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const { data: nearbyPeople, isLoading } = useQuery<NearbyPerson[]>({
    queryKey: ['/api/nearby', viewType],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL('/api/nearby', baseUrl);
      url.searchParams.set('type', viewType);
      url.searchParams.set('radius', '400');
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const people = nearbyPeople || [];
  const title = viewType === 'buddy' ? 'Nearby Buddies' : 'People Nearby';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} testID="nearby-list-back">
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.dark.accentGreen} />
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NearbyPersonRow person={item} showAddBuddy={viewType === 'nearby'} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={people.length > 0}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>
                {viewType === 'buddy' ? 'No buddies nearby' : 'No people nearby'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  listContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 100 },
  personCard: { gap: 10 },
  personTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personInfo: { flex: 1, gap: 2 },
  personName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  personUsername: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  personMeta: { alignItems: 'flex-end', gap: 4 },
  distanceText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentGreen },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusChipText: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  interestRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  interestChip: { backgroundColor: Colors.dark.accentBlueDim, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  interestText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.dark.accentBlue },
  actionRow: { flexDirection: 'row', gap: 10, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.dark.separator },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.dark.surfaceElevated },
  addBuddyBtn: { backgroundColor: 'rgba(0,255,136,0.08)' },
  actionBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.accentBlue },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
});
