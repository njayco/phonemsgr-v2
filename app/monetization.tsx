import { View, Text, ScrollView, StyleSheet, Pressable, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { useAuth } from '@/lib/auth-context';
import { REVENUE_DATA } from '@/lib/mock-data';
import Colors from '@/constants/colors';

function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const barCount = data.length;
  return (
    <View style={chartStyles.container}>
      {data.map((val, i) => (
        <View key={i} style={chartStyles.barWrapper}>
          <LinearGradient
            colors={[Colors.dark.accentGreen, Colors.dark.accentBlue]}
            style={[chartStyles.bar, { height: `${(val / max) * 100}%` }]}
          />
        </View>
      ))}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: 6 },
  barWrapper: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 4, minHeight: 4 },
});

export default function MonetizationScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [inboxPriceEnabled, setInboxPriceEnabled] = useState(true);
  const [priceValue, setPriceValue] = useState(user?.inboxPrice?.toString() || '5.00');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Monetization Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Phone Msgr 2026 Executive Tier</Text>

        <View style={styles.twoCol}>
          <GlassCard style={styles.halfCard} borderColor={Colors.dark.accentBlue}>
            <Text style={styles.cardTitle}>Inbox Pricing</Text>
            <View style={styles.toggleRow}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color={Colors.dark.accentBlue} />
              <Pressable
                style={[styles.toggleSwitch, inboxPriceEnabled && styles.toggleSwitchOn]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setInboxPriceEnabled(!inboxPriceEnabled);
                }}
              >
                <View style={[styles.toggleKnob, inboxPriceEnabled && styles.toggleKnobOn]} />
              </Pressable>
            </View>
            <Text style={styles.cardDesc}>per message from non-contacts</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.priceSign}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={priceValue}
                onChangeText={setPriceValue}
                keyboardType="decimal-pad"
                editable={inboxPriceEnabled}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.halfCard} borderColor={Colors.dark.accentCyan}>
            <Text style={styles.cardTitle}>Event Hosting</Text>
            <Pressable style={styles.eventButton}>
              <MaterialCommunityIcons name="calendar-plus" size={24} color={Colors.dark.accentCyan} />
              <Text style={styles.eventButtonText}>Create Paid Event</Text>
            </Pressable>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>$15</Text>
              <View style={styles.sliderTrack}>
                <View style={styles.sliderFill} />
              </View>
              <Text style={styles.sliderLabel}>$150</Text>
            </View>
          </GlassCard>
        </View>

        <GlassCard borderColor={Colors.dark.accentGreen}>
          <Text style={styles.revTitle}>Revenue Overview</Text>
          <MiniChart data={REVENUE_DATA} />
          <View style={styles.revRow}>
            <Text style={styles.revAmount}>${user?.monthlyRevenue?.toLocaleString() || '0'}</Text>
            <Text style={styles.revPeriod}>this month</Text>
          </View>
          <Pressable
            style={styles.withdrawButton}
            onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
          >
            <Text style={styles.withdrawText}>Withdraw</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, textAlign: 'center' },
  twoCol: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleSwitchOn: { backgroundColor: Colors.dark.accentGreen },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleKnobOn: { alignSelf: 'flex-end' },
  cardDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.inputBackground, borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: Colors.dark.glassBorder },
  priceSign: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  priceInput: { flex: 1, height: 36, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, textAlign: 'right' },
  eventButton: { alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 12, padding: 12 },
  eventButtonText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentCyan },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sliderLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  sliderTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  sliderFill: { width: '40%', height: 4, backgroundColor: Colors.dark.accentCyan, borderRadius: 2 },
  revTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, marginBottom: 12 },
  revRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12 },
  revAmount: { fontSize: 32, fontFamily: 'Inter_700Bold', color: Colors.dark.accentGreen },
  revPeriod: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  withdrawButton: { backgroundColor: Colors.dark.accentGreen, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  withdrawText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#000000' },
});
