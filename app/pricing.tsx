import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface PlanInfo {
  name: string;
  price: string;
  period: string;
  features: string[];
  borderColor: string;
  recommended?: boolean;
  bgColors: [string, string];
}

const PLANS: PlanInfo[] = [
  {
    name: 'Temp',
    price: 'Free',
    period: '',
    features: ['Basic Messaging', 'Local Feed Access', 'Standard Profile'],
    borderColor: 'rgba(255,255,255,0.2)',
    bgColors: [Colors.dark.surface, Colors.dark.surfaceElevated],
  },
  {
    name: 'Associate',
    price: '$4.99',
    period: '/mo',
    features: ['Priority Support', 'Extended Radius 800m', 'Custom Badge', 'Analytics'],
    borderColor: Colors.dark.accentBlue,
    bgColors: ['rgba(0,80,180,0.15)', 'rgba(0,40,100,0.1)'],
  },
  {
    name: 'Executive',
    price: '$14.99',
    period: '/mo',
    features: ['Inbox Monetization', 'Event Hosting', 'Verified Status', 'Premium Analytics', 'Priority Visibility'],
    borderColor: Colors.dark.accentGreen,
    recommended: true,
    bgColors: ['rgba(0,120,60,0.15)', 'rgba(0,60,30,0.1)'],
  },
];

function PlanCard({ plan }: { plan: PlanInfo }) {
  return (
    <Pressable
      style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
    >
      <LinearGradient
        colors={plan.bgColors}
        style={[styles.planCard, { borderColor: plan.borderColor }]}
      >
        <View style={styles.planHeader}>
          <View style={[styles.planNameBadge, { borderColor: plan.borderColor }]}>
            <Text style={[styles.planNameText, { color: plan.borderColor }]}>{plan.name}</Text>
          </View>
          {plan.recommended && (
            <View style={styles.recommendedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.dark.accentGreen} />
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{plan.price}</Text>
          {plan.period ? <Text style={styles.periodText}>{plan.period}</Text> : null}
        </View>
        <View style={styles.featureList}>
          {plan.features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark" size={14} color={plan.borderColor} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.dark.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choose Your Plan</Text>

        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}

        <LinearGradient
          colors={['rgba(255,184,0,0.12)', 'rgba(255,184,0,0.05)']}
          style={styles.offlinePlan}
        >
          <View style={styles.offlinePlanHeader}>
            <MaterialCommunityIcons name="shield-lock" size={20} color={Colors.dark.warning} />
            <Text style={styles.offlinePlanTitle}>Offline Resilience Plan - $19.99/year</Text>
          </View>
          <Text style={styles.offlinePlanDesc}>Secure local data backup & emergency broadcast features.</Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold', color: Colors.dark.text, textAlign: 'center', marginBottom: 8 },
  planCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 12 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planNameBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  planNameText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  recommendedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recommendedText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.dark.accentGreen },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceText: { fontSize: 36, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  periodText: { fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  offlinePlan: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', padding: 16, gap: 6 },
  offlinePlanHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offlinePlanTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.warning },
  offlinePlanDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
});
