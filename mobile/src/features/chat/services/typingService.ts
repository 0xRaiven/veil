import { supabase } from '../../../services/supabase/client';
import { usePresenceStore } from '../store/usePresenceStore';

class TypingService {
  private channels: Record<string, any> = {};

  joinRoom(conversationId: string, currentUserId: string) {
    if (this.channels[conversationId]) return;

    const db = supabase as any;
    const channel = db.channel(`room:${conversationId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { user_id } = payload.payload;
        if (user_id !== currentUserId) {
          usePresenceStore.getState().setTypingStatus(conversationId, user_id);
          
          // Auto-clear typing after 3 seconds if we don't get a new broadcast
          setTimeout(() => {
            const currentTyping = usePresenceStore.getState().typingUsers[conversationId];
            if (currentTyping === user_id) {
              usePresenceStore.getState().setTypingStatus(conversationId, null);
            }
          }, 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload: any) => {
        const { user_id } = payload.payload;
        if (user_id !== currentUserId) {
          usePresenceStore.getState().setTypingStatus(conversationId, null);
        }
      })
      .subscribe();

    this.channels[conversationId] = channel;
  }

  leaveRoom(conversationId: string) {
    const channel = this.channels[conversationId];
    if (channel) {
      const db = supabase as any;
      db.removeChannel(channel);
      delete this.channels[conversationId];
    }
  }

  sendTypingEvent(conversationId: string, userId: string, isTyping: boolean) {
    const channel = this.channels[conversationId];
    if (!channel) return;

    channel.send({
      type: 'broadcast',
      event: isTyping ? 'typing' : 'stop_typing',
      payload: { user_id: userId }
    });
  }
}

export const typingService = new TypingService();
