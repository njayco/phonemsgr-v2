import { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, TextInput, FlatList, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getApiUrl } from '@/lib/query-client';
import { fetch } from 'expo/fetch';
import Colors from '@/constants/colors';

export interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
}

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gif: GifResult) => void;
}

type Tab = 'gifs' | 'memes';

export function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
  const [tab, setTab] = useState<Tab>('gifs');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<GifResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const base = getApiUrl();
    const url = new URL('/api/giphy/gifs', base);
    if (debouncedQuery.trim()) url.searchParams.set('q', debouncedQuery.trim());
    url.searchParams.set('kind', tab);
    fetch(url.toString(), { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error((data as any).message || 'Failed to load GIFs');
        }
        return r.json();
      })
      .then((data: GifResult[]) => {
        if (!cancelled) setResults(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setResults([]);
          setError(e?.message || 'Failed to load GIFs');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [visible, debouncedQuery, tab]);

  const handleSelect = (gif: GifResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreview(null);
    onSelect(gif);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>GIFs & Memes</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} testID="gif-picker-close">
              <Ionicons name="close" size={22} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            {(['gifs', 'memes'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
                testID={`gif-tab-${t}`}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'gifs' ? 'Trending GIFs' : 'Memes & Reactions'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={Colors.dark.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search GIPHY..."
              placeholderTextColor={Colors.dark.textMuted}
              value={query}
              onChangeText={setQuery}
              testID="gif-search-input"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={Colors.dark.textMuted} />
              </Pressable>
            )}
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator color={Colors.dark.accentBlue} /></View>
          ) : error ? (
            <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
          ) : (
            <FlatList
              data={results}
              numColumns={3}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <Pressable style={styles.gifCell} onPress={() => setPreview(item)} testID={`gif-cell-${item.id}`}>
                  <Image source={{ uri: item.previewUrl }} style={styles.gifImage} contentFit="cover" />
                </Pressable>
              )}
              ListEmptyComponent={<View style={styles.center}><Text style={styles.errorText}>No results</Text></View>}
            />
          )}

          <Text style={styles.attribution}>Powered by GIPHY</Text>
        </View>

        {preview && (
          <View style={styles.previewOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreview(null)} />
            <View style={styles.previewCard}>
              <Image source={{ uri: preview.url }} style={styles.previewImage} contentFit="contain" />
              <View style={styles.previewActions}>
                <Pressable style={styles.previewCancel} onPress={() => setPreview(null)}>
                  <Text style={styles.previewCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.previewSelect} onPress={() => handleSelect(preview)} testID="gif-select-button">
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.previewSelectText}>Use this GIF</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    height: '75%',
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'web' ? 20 : 30,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textMuted, alignSelf: 'center', marginTop: 8, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center' },
  tabBtnActive: { borderWidth: 1, borderColor: Colors.dark.accentBlue },
  tabText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  tabTextActive: { color: Colors.dark.accentBlue },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dark.inputBackground, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.dark.glassBorder,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 8 : 6, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  grid: { gap: 4, paddingBottom: 8 },
  gifCell: { flex: 1 / 3, aspectRatio: 1, margin: 2, borderRadius: 8, overflow: 'hidden', backgroundColor: Colors.dark.surfaceElevated },
  gifImage: { width: '100%', height: '100%' },
  attribution: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, textAlign: 'center', marginTop: 6 },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  previewCard: { width: '85%', backgroundColor: Colors.dark.background, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.glassBorder, padding: 14, gap: 12 },
  previewImage: { width: '100%', height: 240, borderRadius: 10, backgroundColor: Colors.dark.surfaceElevated },
  previewActions: { flexDirection: 'row', gap: 10 },
  previewCancel: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center' },
  previewCancelText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary },
  previewSelect: { flex: 1.4, flexDirection: 'row', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.dark.accentBlue, alignItems: 'center', justifyContent: 'center' },
  previewSelectText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
