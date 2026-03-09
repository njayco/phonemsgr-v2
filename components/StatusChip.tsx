import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface StatusChipProps {
  label: string;
  color?: string;
  small?: boolean;
}

export function StatusChip({ label, color = Colors.dark.accentGreen, small }: StatusChipProps) {
  return (
    <View style={[styles.chip, { borderColor: color }, small && styles.chipSmall]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, small && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  chipSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  textSmall: {
    fontSize: 9,
  },
});
