import { View, StyleSheet, ViewStyle } from 'react-native';
import Colors from '@/constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  borderColor?: string;
}

export function GlassCard({ children, style, borderColor }: GlassCardProps) {
  return (
    <View style={[styles.card, borderColor ? { borderColor } : undefined, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.glassBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    padding: 16,
    overflow: 'hidden',
  },
});
