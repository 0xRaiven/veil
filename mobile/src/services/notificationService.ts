import { getMessaging, requestPermission, getToken, onTokenRefresh, AuthorizationStatus } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { supabase } from './supabase/client';

export const notificationService = {
  async requestUserPermission() {
    const messaging = getMessaging();
    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('[NotificationService] Authorization status:', authStatus);
    }
    return enabled;
  },

  async syncToken(userId: string) {
    try {
      const hasPermission = await this.requestUserPermission();
      if (!hasPermission) return;

      const messaging = getMessaging();
      const token = await getToken(messaging);
      await this.saveTokenToDatabase(userId, token);

      // Listen to whether the token changes
      onTokenRefresh(messaging, (newToken: string) => {
        this.saveTokenToDatabase(userId, newToken);
      });
    } catch (error) {
      console.error('[NotificationService] Failed to sync token:', error);
    }
  },

  async saveTokenToDatabase(userId: string, token: string) {
    try {
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      
      const { error } = await (supabase as any).rpc('register_push_token', {
        p_token: token,
        p_platform: platform
      });

      if (error) {
        console.error('[NotificationService] Error saving token:', error);
      } else {
        console.log('[NotificationService] Token saved successfully');
      }
    } catch (error) {
      console.error('[NotificationService] Exception saving token:', error);
    }
  },

  async removeToken(userId: string) {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging);
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);
    } catch (error) {
      console.error('[NotificationService] Failed to remove token:', error);
    }
  }
};
