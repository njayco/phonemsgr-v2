import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const handleSignIn = async () => {
    if (!username.trim()) {
      Alert.alert('Required', 'Please enter your username');
      return;
    }
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signIn(username.trim());
    setIsLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to Phone Msgr</Text>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={Colors.dark.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={14}
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.signInButton, pressed && { opacity: 0.85 }, isLoading && { opacity: 0.5 }]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.signInText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    marginBottom: 40,
  },
  form: {
    gap: 24,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.dark.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    paddingHorizontal: 16,
  },
  inputPrefix: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: Colors.dark.accentBlue,
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.text,
  },
  signInButton: {
    backgroundColor: Colors.dark.accentBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
});
