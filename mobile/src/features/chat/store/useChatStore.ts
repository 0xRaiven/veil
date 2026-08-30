import { create } from 'zustand';
import { supabase } from '../../../services/supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content_type: 'plaintext' | 'encrypted' | 'system';
  content: string;
  created_at: string;
  local_media_path?: string | null;
  status: 'sending' | 'sent' | 'read' | 'error';
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  other_member?: {
    id: string;
    display_name: string | null;
    avatar_path: string | null;
    local_avatar_path?: string | null;
    last_read_at?: string;
    last_seen?: string | null;
  };
  last_message?: string;
  unread_count?: number;
}

interface ChatState {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>; // Keyed by conversation_id
  loadingConversations: boolean;
  isRealtimeActive: boolean;
  
  setConversations: (convs: Conversation[]) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessageStatus: (msgId: string, status: 'sending' | 'sent' | 'error') => void;
  updateOtherMemberReadStatus: (conversationId: string, lastReadAt: string) => void;
  
  startRealtime: (userId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: {},
  messages: {},
  loadingConversations: true,
  isRealtimeActive: false,

  setConversations: (convs) => {
    const map: Record<string, Conversation> = {};
    convs.forEach(c => map[c.id] = c);
    set({ conversations: map, loadingConversations: false });
  },

  setMessages: (conversationId, msgs) => {
    set((state) => ({
      messages: { ...state.messages, [conversationId]: msgs }
    }));
  },

  addMessage: (msg) => {
    set((state) => {
      const existing = state.messages[msg.conversation_id] || [];
      // Deduplicate: If we already have this message (optimistic), replace it or ignore.
      const index = existing.findIndex(m => m.id === msg.id);
      let newMessages = [...existing];
      if (index !== -1) {
        // Update existing (e.g., transition from sending -> sent)
        newMessages[index] = { ...existing[index], ...msg, status: 'sent' };
      } else {
        // Add new (unshift because inverted FlatList expects newest first)
        newMessages.unshift({ ...msg, status: 'sent' });
      }

      // Update conversation last_message snippet (simple approach)
      const conv = state.conversations[msg.conversation_id];
      const newConversations = { ...state.conversations };
      if (conv) {
        newConversations[msg.conversation_id] = {
          ...conv,
          last_message: msg.content_type === 'plaintext' ? msg.content : '[Encrypted Message]',
          updated_at: msg.created_at
        };
      }

      return { 
        messages: { ...state.messages, [msg.conversation_id]: newMessages },
        conversations: newConversations
      };
    });
  },

  updateMessageStatus: (msgId, status) => {
    set(state => {
      const newMessages = { ...state.messages };
      for (const [convId, msgs] of Object.entries(newMessages)) {
        const index = msgs.findIndex(m => m.id === msgId);
        if (index !== -1) {
          const updatedMsgs = [...msgs];
          updatedMsgs[index] = { ...updatedMsgs[index], status };
          newMessages[convId] = updatedMsgs;
          break;
        }
      }
      return { messages: newMessages };
    });
  },

  updateOtherMemberReadStatus: (conversationId, lastReadAt) => {
    set(state => {
      const conv = state.conversations[conversationId];
      if (!conv || !conv.other_member) return state;
      return {
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...conv,
            other_member: {
              ...conv.other_member,
              last_read_at: lastReadAt
            }
          }
        }
      };
    });
  },

  startRealtime: (userId: string) => {
    if (get().isRealtimeActive) return;
    set({ isRealtimeActive: true });

    const db = supabase as any;
    const channel = db.channel(`chat_realtime:${Date.now()}`);
    
    // Listen for new messages
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload: any) => {
        const msg = payload.new as Message;
        
        // Persist to local DB
        const { localDb } = require('../../../services/databaseService');
        localDb.execute(
          `INSERT OR IGNORE INTO local_messages (id, conversation_id, sender_id, content_type, content, created_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [msg.id, msg.conversation_id, msg.sender_id, msg.content_type, msg.content, msg.created_at, 'sent']
        );
        
        const preview = msg.content_type === 'plaintext' ? msg.content : '🔒 Encrypted Message';
        localDb.execute(
          'UPDATE local_conversations SET last_message = ?, updated_at = ? WHERE id = ?',
          [preview, msg.created_at, msg.conversation_id]
        );

        // Update UI state
        // Skip optimistic duplicates if we already added it locally as sending
        if (msg.sender_id !== userId) {
          get().addMessage({ ...msg, status: 'sent' });
        } else {
          // If it was us, just confirm it's sent
          get().updateMessageStatus(msg.id, 'sent');
        }
      }
    ).subscribe();

    const membersChannel = db.channel(`members_realtime:${Date.now()}`);
    membersChannel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversation_members' },
      (payload: any) => {
        const { conversation_id, user_id, last_read_at } = payload.new;
        if (user_id !== userId && last_read_at) {
          get().updateOtherMemberReadStatus(conversation_id, last_read_at);
        }
      }
    ).subscribe();
  }
}));
