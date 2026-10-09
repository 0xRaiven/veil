import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { getProfile, updateProfile, uploadAvatar, ProfileData } from '../services/profile';
import { Avatar } from '../../../components/Avatar';
import { launchImageLibrary } from 'react-native-image-picker';

export const ProfileScreen = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getProfile(user.id);
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || '');
      setBio(data.bio || '');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: displayName,
        bio: bio
      });
      Alert.alert('Success', 'Profile updated successfully.');
      loadProfile(); // Refresh
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async () => {
    if (!user) return;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) return;

    setUploadingAvatar(true);
    try {
      await uploadAvatar(user.id, asset.uri, asset.type || 'image/jpeg');
      Alert.alert('Success', 'Avatar updated.');
      loadProfile(); // Refresh to fetch new signed URL
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleAvatarSelect} disabled={uploadingAvatar}>
            <Avatar path={profile?.avatar_path || null} size={120} fallbackText={displayName || user?.email || '?'} />
            {uploadingAvatar && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHelpText}>Tap to change avatar</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Anonymous User"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell your friends about yourself"
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />

          <View style={styles.buttonContainer}>
            <Button title={saving ? "Saving..." : "Save Profile"} onPress={handleSave} disabled={saving} color="#4A90E2" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#000' },
  avatarSection: { alignItems: 'center', marginVertical: 30 },
  avatarLoadingOverlay: { ...StyleSheet.absoluteFill as any, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  avatarHelpText: { color: '#888', marginTop: 10, fontSize: 14 },
  formSection: { paddingHorizontal: 20 },
  label: { color: '#ccc', marginBottom: 8, fontSize: 16 },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#333', fontSize: 16 },
  bioInput: { height: 100, textAlignVertical: 'top' },
  buttonContainer: { marginTop: 10 }
});
