import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) return <View style={styles.container} />;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0F', '#0F1A2A', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: topInset + 60, paddingBottom: bottomInset + 20 }]}>
        <View style={styles.iconContainer}>
          <View style={styles.iconGlow}>
            <Ionicons name="chatbubbles" size={64} color={Colors.dark.accentGreen} />
          </View>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Connect.{'\n'}Earn Kindness.{'\n'}Stay Resilient.</Text>
          <Text style={styles.subtitle}>The kindness-based social messenger{'\n'}for real life</Text>
        </View>

        <View style={styles.buttonSection}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={() => router.push('/sign-up')}
          >
            <LinearGradient
              colors={[Colors.dark.accentBlue, '#0077CC']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Online or Offline.{'\n'}Your communication continues.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
  },
  iconGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,255,136,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    color: Colors.dark.text,
    textAlign: 'center',
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonSection: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryButtonText: {
    color: Colors.dark.text,
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
