import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleSignUp = async () => {
    if (!username.trim()) {
      Alert.alert('Required', 'Please choose a username');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    if (!password.trim() || password.length < 4) {
      Alert.alert('Required', 'Password must be at least 4 characters');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signUp(username.trim(), displayName.trim(), phone.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.message?.includes('409')
        ? 'Username already taken'
        : 'Sign up failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: bottomInset + 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the kindness-based network</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>+1</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

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

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Colors.dark.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 4 characters"
                placeholderTextColor={Colors.dark.textMuted}
                secureTextEntry
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.signUpButton, pressed && { opacity: 0.85 }, isLoading && { opacity: 0.5 }]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.signUpText}>{isLoading ? 'Creating...' : 'Create Account'}</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: Colors.dark.text,
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    marginBottom: 40,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  form: {
    gap: 20,
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
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.text,
  },
  signUpButton: {
    backgroundColor: Colors.dark.accentGreen,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  signUpText: {
    color: '#000000',
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
});
