import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput, ActivityIndicator, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation } from '@tanstack/react-query';
import { GlassCard } from '@/components/GlassCard';
import { apiRequest, queryClient, getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';

type Audience = 'everyone' | 'buddy' | 'nearby';
type MediaType = 'text' | 'image' | 'video' | 'audio' | 'document';

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

const audienceOptions: { value: Audience; label: string; icon: string }[] = [
  { value: 'everyone', label: 'Everyone', icon: 'globe-outline' },
  { value: 'buddy', label: 'Buddies', icon: 'people-outline' },
  { value: 'nearby', label: 'Nearby', icon: 'location-outline' },
];

const mediaTypes: { value: MediaType; icon: string; color: string }[] = [
  { value: 'text', icon: 'text-outline', color: Colors.dark.text },
  { value: 'image', icon: 'images-outline', color: Colors.dark.accentBlue },
  { value: 'video', icon: 'play-circle-outline', color: Colors.dark.accentGreen },
  { value: 'audio', icon: 'musical-notes-outline', color: '#FF6B9D' },
  { value: 'document', icon: 'document-text-outline', color: Colors.dark.accentCyan },
];

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<Audience>('everyone');
  const [mediaType, setMediaType] = useState<MediaType>('text');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName || `image_${Date.now()}.jpg`;
      setSelectedFile({ uri: asset.uri, name, type: asset.mimeType || 'image/jpeg' });
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.7,
      videoMaxDuration: 120,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName || `video_${Date.now()}.mp4`;
      setSelectedFile({ uri: asset.uri, name, type: asset.mimeType || 'video/mp4' });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: mediaType === 'audio'
        ? ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/*']
        : ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.apple.keynote'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const fallbackMime = mediaType === 'audio' ? 'audio/mpeg' : 'application/pdf';
      setSelectedFile({ uri: asset.uri, name: asset.name, type: asset.mimeType || fallbackMime, size: asset.size || undefined });
    }
  };

  const handlePickMedia = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mediaType === 'image') {
      await pickImage();
    } else if (mediaType === 'video') {
      await pickVideo();
    } else if (mediaType === 'audio' || mediaType === 'document') {
      await pickDocument();
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, selectedFile.name);
      } else {
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.type,
        } as any);
      }
      const apiUrl = getApiUrl();
      const uploadUrl = new URL('/api/upload/media', apiUrl).toString();
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const postMutation = useMutation({
    mutationFn: async () => {
      let mediaUrl: string | undefined;
      if (selectedFile) {
        const url = await uploadFile();
        if (!url) throw new Error('File upload failed');
        mediaUrl = url;
      }
      await apiRequest('POST', '/api/feed', {
        content,
        mediaType,
        audience,
        mediaUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      router.back();
    },
  });

  const handlePost = () => {
    if (!content.trim() && !selectedFile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    postMutation.mutate();
  };

  const canPost = (content.trim().length > 0 || selectedFile) && !postMutation.isPending && !uploading;

  const handleMediaTypeChange = (mt: MediaType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMediaType(mt);
    setSelectedFile(null);
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  const getFileIcon = (): string => {
    if (mediaType === 'image') return 'image';
    if (mediaType === 'video') return 'videocam';
    if (mediaType === 'audio') return 'musical-notes';
    return 'document-text';
  };

  const getFileColor = (): string => {
    if (mediaType === 'image') return Colors.dark.accentBlue;
    if (mediaType === 'video') return Colors.dark.accentGreen;
    if (mediaType === 'audio') return '#FF6B9D';
    return Colors.dark.accentCyan;
  };

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
          {postMutation.isPending || uploading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>Post</Text>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.textInput}
          placeholder="What's on your mind?"
          placeholderTextColor={Colors.dark.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
          testID="post-content-input"
        />

        <GlassCard style={styles.optionsCard}>
          <Text style={styles.optionLabel}>Content Type</Text>
          <View style={styles.mediaTypeRow}>
            {mediaTypes.map((mt) => (
              <Pressable
                key={mt.value}
                style={[styles.mediaTypeBtn, mediaType === mt.value && styles.mediaTypeBtnActive]}
                onPress={() => handleMediaTypeChange(mt.value)}
              >
                <Ionicons
                  name={mt.icon as any}
                  size={20}
                  color={mediaType === mt.value ? mt.color : Colors.dark.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </GlassCard>

        {mediaType !== 'text' && (
          <GlassCard style={styles.optionsCard}>
            {!selectedFile ? (
              <Pressable style={styles.pickFileBtn} onPress={handlePickMedia} testID="pick-media-btn">
                <Ionicons name="cloud-upload-outline" size={28} color={getFileColor()} />
                <Text style={[styles.pickFileText, { color: getFileColor() }]}>
                  {mediaType === 'image' ? 'Select Image' :
                   mediaType === 'video' ? 'Select Video' :
                   mediaType === 'audio' ? 'Select Audio' : 'Select Document'}
                </Text>
                <Text style={styles.pickFileHint}>Tap to browse files</Text>
              </Pressable>
            ) : (
              <View style={styles.filePreview}>
                {mediaType === 'image' && (
                  <Image source={{ uri: selectedFile.uri }} style={styles.imagePreview} resizeMode="cover" />
                )}
                {mediaType !== 'image' && (
                  <View style={[styles.fileIcon, { backgroundColor: `${getFileColor()}15` }]}>
                    <Ionicons name={getFileIcon() as any} size={32} color={getFileColor()} />
                  </View>
                )}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                  {selectedFile.size && (
                    <Text style={styles.fileSize}>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</Text>
                  )}
                </View>
                <Pressable onPress={clearFile} style={styles.clearFileBtn}>
                  <Ionicons name="close-circle" size={24} color={Colors.dark.textMuted} />
                </Pressable>
              </View>
            )}
          </GlassCard>
        )}

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

        {postMutation.isError && (
          <Text style={styles.errorText}>Failed to create post. Please try again.</Text>
        )}
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
  textInput: { fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.dark.text, minHeight: 120, marginBottom: 16, lineHeight: 24 },
  optionsCard: { marginBottom: 12, gap: 10 },
  optionLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary },
  mediaTypeRow: { flexDirection: 'row', gap: 8 },
  mediaTypeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  mediaTypeBtnActive: { borderWidth: 1, borderColor: Colors.dark.accentBlue },
  audienceRow: { flexDirection: 'row', gap: 8 },
  audienceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.dark.surfaceElevated },
  audienceBtnActive: { borderWidth: 1, borderColor: Colors.dark.accentBlue },
  audienceBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  audienceBtnTextActive: { color: Colors.dark.accentBlue },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.offlineRed, textAlign: 'center', marginTop: 12 },
  pickFileBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8, borderWidth: 1, borderColor: Colors.dark.glassBorder, borderRadius: 12, borderStyle: 'dashed' as const },
  pickFileText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  pickFileHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  filePreview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 4 },
  imagePreview: { width: 60, height: 60, borderRadius: 10 },
  fileIcon: { width: 60, height: 60, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1, gap: 2 },
  fileName: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.dark.text },
  fileSize: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  clearFileBtn: { padding: 4 },
});
