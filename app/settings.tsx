import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';

interface SettingToggle {
  label: string;
  icon: string;
  iconSet: 'ionicons' | 'material';
  value: boolean;
  key: string;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [settings, setSettings] = useState<Record<string, boolean>>({
    ghostMode: false,
    interestDiscovery: true,
    mutualFiltering: true,
    seeEveryone: false,
    notifications: true,
    messageNotifs: true,
    feedNotifs: true,
    kindnessNotifs: true,
  });

  const toggle = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const planLabel = user?.plan === 'executive' ? 'Executive' : user?.plan === 'associate' ? 'Associate' : 'Temp';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRIVACY</Text>
          <View style={styles.settingGroup}>
            <SettingRow icon="eye-off" label="Ghost Mode" value={settings.ghostMode} onToggle={() => toggle('ghostMode')} desc="Hide your presence from other users" />
            <SettingRow icon="compass" label="Interest-Based Discovery" value={settings.interestDiscovery} onToggle={() => toggle('interestDiscovery')} desc="Only show users with matching interests" />
            <SettingRow icon="git-compare" label="Mutual Filtering" value={settings.mutualFiltering} onToggle={() => toggle('mutualFiltering')} desc="Only show users who match your criteria" />
            <SettingRow icon="globe" label="See Everyone (Premium)" value={settings.seeEveryone} onToggle={() => toggle('seeEveryone')} desc="View all nearby users regardless of filters" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.settingGroup}>
            <SettingRow icon="notifications" label="Push Notifications" value={settings.notifications} onToggle={() => toggle('notifications')} />
            <SettingRow icon="chatbubble" label="Message Alerts" value={settings.messageNotifs} onToggle={() => toggle('messageNotifs')} />
            <SettingRow icon="layers" label="Feed Updates" value={settings.feedNotifs} onToggle={() => toggle('feedNotifs')} />
            <SettingRow icon="heart" label="Kindness Points" value={settings.kindnessNotifs} onToggle={() => toggle('kindnessNotifs')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.settingGroup}>
            <NavRow icon="shield-checkmark" label="Subscription" sublabel={`${planLabel} Plan`} onPress={() => router.push('/pricing')} />
            <NavRow icon="cash" label="Monetization" sublabel="Manage revenue settings" onPress={() => router.push('/monetization')} />
            <NavRow icon="cloud-offline" label="Offline Resilience" sublabel="Mesh mode settings" onPress={() => router.push('/offline')} />
          </View>
        </View>

        <Text style={styles.version}>Phone Msgr v2026.1.0</Text>
      </ScrollView>
    </View>
  );
}

function SettingRow({ icon, label, value, onToggle, desc }: { icon: string; label: string; value: boolean; onToggle: () => void; desc?: string }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={20} color={Colors.dark.accentBlue} />
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{label}</Text>
          {desc && <Text style={styles.settingDesc}>{desc}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: Colors.dark.accentGreen }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function NavRow({ icon, label, sublabel, onPress }: { icon: string; label: string; sublabel: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={20} color={Colors.dark.accentBlue} />
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingDesc}>{sublabel}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, gap: 24 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textMuted, letterSpacing: 1, paddingHorizontal: 4 },
  settingGroup: { backgroundColor: Colors.dark.glassBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.glassBorder, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.dark.separator },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingInfo: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.dark.text },
  settingDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  version: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, textAlign: 'center', marginTop: 8 },
});
