import { supabase } from '../../../services/supabase/client';

export interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  phone_hash?: string | null;
}

export const getProfile = async (userId: string): Promise<ProfileData | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<ProfileData>) => {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', userId);

  if (error) throw error;
};

export const uploadAvatar = async (userId: string, uri: string, mimeType: string = 'image/jpeg') => {
  try {
    const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Update the profile with the new path
    await updateProfile(userId, { avatar_path: path });

    return path;
  } catch (e) {
    console.error('Failed to upload avatar', e);
    throw e;
  }
};

export const getAvatarSignedUrl = async (path: string, expiresIn: number = 3600) => {
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error generating signed url:', error);
    return null;
  }
  return data?.signedUrl;
};
