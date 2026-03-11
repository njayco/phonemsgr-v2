import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/GlassCard';
import { useUpload } from '@/lib/upload-context';
import Colors from '@/constants/colors';

type Audience = 'everyone' | 'buddy' | 'nearby';

const audienceOptions: { value: Audience; label: string; icon: string }[] = [
  { value: 'everyone', label: 'Everyone', icon: 'globe-outline' },
  { value: 'buddy', label: 'Buddies', icon: 'people-outline' },
  { value: 'nearby', label: 'Nearby', icon: 'location-outline' },
];

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const { startUpload } = useUpload();
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<Audience>('everyone');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const handlePost = () => {
    if (!content.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startUpload({
      content,
      mediaType: 'text',
      audience,
      file: null,
    });
    router.back();
  };

  const canPost = content.trim().length > 0;

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
  textInput: { fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.dark.text, minHeight: 120, marginBottom: 16, lineHeight: 24 },
  optionsCard: { marginBottom: 12, gap: 10 },
  optionLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary },
  audienceRow: { flexDirection: 'row', gap: 8 },
  audienceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.dark.surfaceElevated },
  audienceBtnActive: { borderWidth: 1, borderColor: Colors.dark.accentBlue },
  audienceBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  audienceBtnTextActive: { color: Colors.dark.accentBlue },
});
