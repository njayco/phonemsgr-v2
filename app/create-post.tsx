import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { GlassCard } from '@/components/GlassCard';
import { useUpload } from '@/lib/upload-context';
import type { PickedFile } from '@/lib/upload-file';
import Colors from '@/constants/colors';

type Audience = 'everyone' | 'buddy' | 'nearby';

const audienceOptions: { value: Audience; label: string; icon: string }[] = [
  { value: 'everyone', label: 'Everyone', icon: 'globe-outline' },
  { value: 'buddy', label: 'Buddies', icon: 'people-outline' },
  { value: 'nearby', label: 'Nearby', icon: 'location-outline' },
];

const MAX_PHOTOS = 10;

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const { startUpload } = useUpload();
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<Audience>('everyone');
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const pickPhotos = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    const picked: PickedFile[] = result.assets.map((a, i) => ({
      uri: a.uri,
      name: a.fileName || `photo_${Date.now()}_${i}.jpg`,
      type: a.mimeType || 'image/jpeg',
    }));
    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const movePhoto = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handlePost = () => {
    if (!content.trim() && photos.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startUpload({
      content: content.trim(),
      mediaType: photos.length > 0 ? 'image' : 'text',
      audience,
      file: null,
      files: photos.length > 0 ? photos : undefined,
    });
    router.back();
  };

  const canPost = content.trim().length > 0 || photos.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} testID="create-post-back">
          <Ionicons name="close" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Post</Text>
        <Pressable
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
          testID="submit-post"
        >
          <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>Post</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.textInput}
          placeholder={photos.length > 0 ? 'Add a caption (optional)...' : "What's on your mind?"}
          placeholderTextColor={Colors.dark.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
          testID="post-content-input"
        />

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip} contentContainerStyle={styles.photoStripContent}>
            {photos.map((p, i) => (
              <View key={`${p.uri}-${i}`} style={styles.photoWrap}>
                <Image source={{ uri: p.uri }} style={styles.photoThumb} contentFit="cover" />
                <Pressable style={styles.photoRemove} onPress={() => removePhoto(i)} testID={`remove-photo-${i}`}>
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                </Pressable>
                <View style={styles.photoReorderRow}>
                  <Pressable
                    style={[styles.reorderBtn, i === 0 && { opacity: 0.3 }]}
                    onPress={() => movePhoto(i, -1)}
                    disabled={i === 0}
                  >
                    <Ionicons name="chevron-back" size={14} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    style={[styles.reorderBtn, i === photos.length - 1 && { opacity: 0.3 }]}
                    onPress={() => movePhoto(i, 1)}
                    disabled={i === photos.length - 1}
                  >
                    <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <Pressable
          style={[styles.addPhotosBtn, photos.length >= MAX_PHOTOS && { opacity: 0.4 }]}
          onPress={photos.length >= MAX_PHOTOS ? undefined : pickPhotos}
          testID="add-photos-button"
        >
          <Ionicons name="images-outline" size={18} color={Colors.dark.accentBlue} />
          <Text style={styles.addPhotosText}>
            {photos.length === 0 ? 'Add Photos' : `Add More (${photos.length}/${MAX_PHOTOS})`}
          </Text>
        </Pressable>

        <GlassCard style={styles.optionsCard}>
          <Text style={styles.optionLabel}>Who can see this?</Text>
          <View style={styles.audienceRow}>
            {audienceOptions.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.audienceBtn, audience === opt.value && styles.audienceBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAudience(opt.value);
                }}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={16}
                  color={audience === opt.value ? Colors.dark.accentBlue : Colors.dark.textMuted}
                />
                <Text style={[styles.audienceBtnText, audience === opt.value && styles.audienceBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  postButton: { backgroundColor: Colors.dark.accentBlue, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, minWidth: 70, alignItems: 'center' },
  postButtonDisabled: { opacity: 0.4 },
  postButtonText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  postButtonTextDisabled: { opacity: 0.6 },
  scrollContent: { flex: 1, paddingHorizontal: 16 },
  textInput: { fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.dark.text, minHeight: 100, marginBottom: 12, lineHeight: 24 },
  photoStrip: { marginBottom: 12 },
  photoStripContent: { gap: 10 },
  photoWrap: { width: 110 },
  photoThumb: { width: 110, height: 110, borderRadius: 12, backgroundColor: Colors.dark.surfaceElevated },
  photoRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  photoReorderRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  reorderBtn: { width: 32, height: 24, borderRadius: 6, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  addPhotosBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.accentBlue,
    borderStyle: 'dashed' as any, marginBottom: 16,
  },
  addPhotosText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.accentBlue },
  optionsCard: { marginBottom: 12, gap: 10 },
  optionLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary },
  audienceRow: { flexDirection: 'row', gap: 8 },
  audienceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.dark.surfaceElevated },
  audienceBtnActive: { borderWidth: 1, borderColor: Colors.dark.accentBlue },
  audienceBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  audienceBtnTextActive: { color: Colors.dark.accentBlue },
});
