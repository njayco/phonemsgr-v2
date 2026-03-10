import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, queryClient, getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';
import { fetch } from 'expo/fetch';

interface Education {
  id: string;
  type: string;
  schoolName: string;
  degree: string;
  major: string;
  graduationYear: number | null;
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [company, setCompany] = useState(user?.company || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploading, setUploading] = useState(false);

  const { data: educationList, isLoading: eduLoading } = useQuery<Education[]>({
    queryKey: ['/api/education'],
  });

  const [editingEdu, setEditingEdu] = useState<Partial<Education> | null>(null);

  const profileMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest('PATCH', '/api/profile', updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const addEduMutation = useMutation({
    mutationFn: async (data: Partial<Education>) => {
      const res = await apiRequest('POST', '/api/education', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/education'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setEditingEdu(null);
    },
  });

  const updateEduMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Education>) => {
      const res = await apiRequest('PATCH', `/api/education/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/education'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setEditingEdu(null);
    },
  });

  const deleteEduMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/education/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/education'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const pickImage = async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setUploading(true);
          const mimeType = asset.mimeType || 'image/jpeg';
          const dataUrl = `data:${mimeType};base64,${asset.base64}`;
          setAvatarUrl(dataUrl);
          try {
            await profileMutation.mutateAsync({ avatarUrl: dataUrl });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            Alert.alert('Error', 'Failed to upload profile picture');
          } finally {
            setUploading(false);
          }
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSaveProfile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await profileMutation.mutateAsync({
        displayName,
        phone,
        occupation,
        company,
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handleSaveEducation = () => {
    if (!editingEdu) return;
    if (!editingEdu.schoolName?.trim()) {
      Alert.alert('Required', 'School name is required');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (editingEdu.id) {
      updateEduMutation.mutate({ id: editingEdu.id, ...editingEdu });
    } else {
      addEduMutation.mutate(editingEdu);
    }
  };

  const handleDeleteEducation = (id: string) => {
    Alert.alert('Delete', 'Remove this education entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEduMutation.mutate(id) },
    ]);
  };

  const educations = educationList || [];

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable onPress={handleSaveProfile} style={styles.saveBtn} disabled={profileMutation.isPending}>
          {profileMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.dark.accentBlue} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={styles.avatarPressable}>
            <Avatar name={displayName || user.username} size={100} imageUrl={avatarUrl} />
            <View style={styles.cameraOverlay}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={20} color="#FFF" />
              )}
            </View>
          </Pressable>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={Colors.dark.textMuted}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Occupation</Text>
            <TextInput
              style={styles.input}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="e.g. Software Engineer"
              placeholderTextColor={Colors.dark.textMuted}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Company</Text>
            <TextInput
              style={styles.input}
              value={company}
              onChangeText={setCompany}
              placeholder="e.g. Google"
              placeholderTextColor={Colors.dark.textMuted}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Education</Text>
            <Pressable
              onPress={() => setEditingEdu({ type: 'college', schoolName: '', degree: '', major: '', graduationYear: null })}
              style={styles.addBtn}
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.dark.accentBlue} />
            </Pressable>
          </View>

          {educations.map((edu) => (
            <View key={edu.id} style={styles.eduCard}>
              <View style={styles.eduHeader}>
                <Ionicons
                  name={edu.type === 'high_school' ? 'school-outline' : 'library-outline'}
                  size={20}
                  color={Colors.dark.accentBlue}
                />
                <View style={styles.eduInfo}>
                  <Text style={styles.eduSchool}>{edu.schoolName}</Text>
                  {edu.type === 'college' && edu.degree ? (
                    <Text style={styles.eduDetail}>
                      {edu.degree}{edu.major ? ` in ${edu.major}` : ''}
                    </Text>
                  ) : null}
                  {edu.graduationYear ? (
                    <Text style={styles.eduYear}>Class of {edu.graduationYear}</Text>
                  ) : null}
                </View>
                <View style={styles.eduActions}>
                  <Pressable onPress={() => setEditingEdu({ ...edu })}>
                    <Ionicons name="pencil" size={18} color={Colors.dark.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteEducation(edu.id)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.dark.offlineRed} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

          {educations.length === 0 && !editingEdu && (
            <Text style={styles.emptyText}>No education added yet</Text>
          )}
        </View>

        {editingEdu && (
          <View style={styles.eduFormCard}>
            <Text style={styles.eduFormTitle}>{editingEdu.id ? 'Edit Education' : 'Add Education'}</Text>

            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeBtn, editingEdu.type === 'high_school' && styles.typeBtnActive]}
                onPress={() => setEditingEdu({ ...editingEdu, type: 'high_school' })}
              >
                <Text style={[styles.typeBtnText, editingEdu.type === 'high_school' && styles.typeBtnTextActive]}>High School</Text>
              </Pressable>
              <Pressable
                style={[styles.typeBtn, editingEdu.type === 'college' && styles.typeBtnActive]}
                onPress={() => setEditingEdu({ ...editingEdu, type: 'college' })}
              >
                <Text style={[styles.typeBtnText, editingEdu.type === 'college' && styles.typeBtnTextActive]}>College</Text>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>School Name</Text>
              <TextInput
                style={styles.input}
                value={editingEdu.schoolName || ''}
                onChangeText={(t) => setEditingEdu({ ...editingEdu, schoolName: t })}
                placeholder="School name"
                placeholderTextColor={Colors.dark.textMuted}
              />
            </View>

            {editingEdu.type === 'college' && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Degree</Text>
                  <TextInput
                    style={styles.input}
                    value={editingEdu.degree || ''}
                    onChangeText={(t) => setEditingEdu({ ...editingEdu, degree: t })}
                    placeholder="e.g. Bachelor's, Master's"
                    placeholderTextColor={Colors.dark.textMuted}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Major</Text>
                  <TextInput
                    style={styles.input}
                    value={editingEdu.major || ''}
                    onChangeText={(t) => setEditingEdu({ ...editingEdu, major: t })}
                    placeholder="e.g. Computer Science"
                    placeholderTextColor={Colors.dark.textMuted}
                  />
                </View>
              </>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Graduation Year</Text>
              <TextInput
                style={styles.input}
                value={editingEdu.graduationYear?.toString() || ''}
                onChangeText={(t) => setEditingEdu({ ...editingEdu, graduationYear: t ? parseInt(t) || null : null })}
                placeholder="e.g. 2024"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>

            <View style={styles.eduFormActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditingEdu(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveEduBtn}
                onPress={handleSaveEducation}
                disabled={addEduMutation.isPending || updateEduMutation.isPending}
              >
                {(addEduMutation.isPending || updateEduMutation.isPending) ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveEduBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accentBlue },
  scrollContent: { paddingHorizontal: 16, gap: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', gap: 8, paddingTop: 8 },
  avatarPressable: { position: 'relative' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.dark.background,
  },
  changePhotoText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.accentBlue },
  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary },
  input: {
    backgroundColor: Colors.dark.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  addBtn: { padding: 4 },
  eduCard: {
    backgroundColor: Colors.dark.glassBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    padding: 14,
  },
  eduHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eduInfo: { flex: 1, gap: 2 },
  eduSchool: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  eduDetail: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  eduYear: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  eduActions: { flexDirection: 'row', gap: 12 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, textAlign: 'center', paddingVertical: 8 },
  eduFormCard: {
    backgroundColor: Colors.dark.glassBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.accentBlue,
    padding: 16,
    gap: 12,
  },
  eduFormTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: Colors.dark.accentBlue, backgroundColor: Colors.dark.accentBlueDim },
  typeBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary },
  typeBtnTextActive: { color: Colors.dark.accentBlue },
  eduFormActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.glassBorder, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary },
  saveEduBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.dark.accentBlue, alignItems: 'center' },
  saveEduBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
});
