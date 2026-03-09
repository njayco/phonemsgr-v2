import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
}

export function GlowButton({ title, onPress, color = Colors.dark.accentBlue, style, disabled, variant = 'filled' }: GlowButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'filled' ? { backgroundColor: color } : { borderColor: color, borderWidth: 1.5 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'outline' && { color }]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
});
