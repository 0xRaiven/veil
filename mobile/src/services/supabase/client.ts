import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Database } from '../../types/database';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// A custom storage adapter that uses react-native-encrypted-storage
// This ensures that the JWT is stored securely in the hardware keystore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await EncryptedStorage.getItem(key);
      return value;
    } catch (e) {
      console.error('Error reading from EncryptedStorage', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await EncryptedStorage.setItem(key, value);
    } catch (e) {
      console.error('Error writing to EncryptedStorage', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from EncryptedStorage', e);
    }
  },
};

// Retrieve environment variables
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env configuration.');
}

// Singleton client instance
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for React Native
  },
});
