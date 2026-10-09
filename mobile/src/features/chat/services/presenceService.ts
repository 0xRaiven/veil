import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../../../services/supabase/client';
import { usePresenceStore } from '../store/usePresenceStore';

class PresenceService {
  private channel: any = null;
  private currentUserId: string | null = null;
  private appStateSubscription: any = null;

  init(userId: string) {
    if (this.currentUserId === userId && this.channel) return;
    
    this.currentUserId = userId;
    const db = supabase as any;
    
    // Clean up any existing channel with the same topic (useful during hot reloads)
    const existingChannel = db.getChannels().find((c: any) => c.topic === 'realtime:presence:global');
    if (existingChannel) {
      db.removeChannel(existingChannel);
    }
    
    this.channel = db.channel('presence:global', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        const onlineUsers: { userId: string; isOnline: boolean }[] = [];
        
        for (const [key, presences] of Object.entries(state)) {
          // If the array has items, the user is online
          if ((presences as any[]).length > 0) {
            onlineUsers.push({ userId: key, isOnline: true });
          }
        }
        
        usePresenceStore.getState().bulkSetOnlineStatus(onlineUsers);
      })
      .on('presence', { event: 'join' }, ({ key }: any) => {
        usePresenceStore.getState().setOnlineStatus(key, true);
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        // Double check they aren't still connected on another device
        const state = this.channel.presenceState();
        if (!state[key] || state[key].length === 0) {
          usePresenceStore.getState().setOnlineStatus(key, false);
          usePresenceStore.getState().setLastSeen(key, new Date().toISOString());
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await this.track();
        }
      });

    // Handle app lifecycle for background tracking
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      await this.track();
    } else if (nextAppState === 'background') {
      await this.untrack();
      await this.updateLastSeenDB();
    }
  };

  private async track() {
    if (!this.channel || !this.currentUserId) return;
    await this.channel.track({ online_at: new Date().toISOString() });
  }

  private async untrack() {
    if (!this.channel) return;
    await this.channel.untrack();
  }

  private async updateLastSeenDB() {
    if (!this.currentUserId) return;
    const db = supabase as any;
    const now = new Date().toISOString();
    await db.from('profiles').update({ last_seen: now }).eq('id', this.currentUserId);
  }

  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.channel) {
      this.untrack().then(() => {
        const db = supabase as any;
        db.removeChannel(this.channel);
        this.channel = null;
      });
    }
    this.currentUserId = null;
  }
}

export const presenceService = new PresenceService();
