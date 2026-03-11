import { View, Text, Image, StyleSheet } from 'react-native';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';

interface AvatarProps {
  name: string;
  size?: number;
  glowColor?: string;
  showGlow?: boolean;
  imageUrl?: string;
}

function resolveAvatarUrl(url?: string): string | undefined {
  if (!url || url.length === 0) return undefined;
  if (url.startsWith('http')) return url;
  if (url.startsWith('data:')) return url;
  const base = getApiUrl();
  return new URL(url, base).toString();
}

export function Avatar({ name, size = 48, glowColor = Colors.dark.accentGreen, showGlow = false, imageUrl }: AvatarProps) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const bgColors = ['#1a3a5c', '#2a1a4c', '#1a4c3a', '#4c1a1a', '#3a3a1a', '#1a3a3a'];
  const idx = (name || '?').charCodeAt(0) % bgColors.length;
  const resolvedUrl = resolveAvatarUrl(imageUrl);
  const hasImage = !!resolvedUrl;

  return (
    <View style={[
      styles.container,
      { width: size + (showGlow ? 6 : 0), height: size + (showGlow ? 6 : 0) },
      showGlow && { borderWidth: 2, borderColor: glowColor, borderRadius: (size + 6) / 2 }
    ]}>
      <View style={[
        styles.inner,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: hasImage ? 'transparent' : bgColors[idx], overflow: 'hidden' }
      ]}>
        {hasImage ? (
          <Image source={{ uri: resolvedUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
});
