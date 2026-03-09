import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { GlassCard } from '@/components/GlassCard';
import { apiRequest, queryClient } from '@/lib/query-client';
import Colors from '@/constants/colors';

type Audience = 'everyone' | 'buddy' | 'nearby';
type MediaType = 'text' | 'image' | 'video' | 'audio' | 'document';

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
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const postMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/feed', {
        content,
        mediaType,
        audience,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      router.back();
    },
  });

  const handlePost = () => {
    if (!content.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    postMutation.mutate();
  };

  const canPost = content.trim().length > 0 && !postMutation.isPending;

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
          {postMutation.isPending ? (
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMediaType(mt.value);
                }}
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
});
