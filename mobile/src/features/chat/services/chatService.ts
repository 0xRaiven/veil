import { supabase } from '../../../services/supabase/client';
import { useChatStore, Message, Conversation } from '../store/useChatStore';

const db = supabase as any;

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const chatService = {
  async fetchConversations(userId: string) {
    // In a production app, this would be a Postgres View or RPC to efficiently join members & last message.
    // For now, we query conversation_members and join profiles.

    const { data: members, error } = await db
      .from('conversation_members')
      .select(`
        conversation_id,
        conversations:conversation_id (
          id, type, created_at, updated_at
        )
      `)
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false });

    if (error) {
      console.error('fetchConversations error:', error);
      return;
    }

    // Now fetch the "other" members to display names/avatars.
    const convIds = members?.map((m: any) => m.conversation_id) || [];
    if (convIds.length === 0) {
      useChatStore.getState().setConversations([]);
      return;
    }

    const { data: otherMembers } = await db
      .from('conversation_members')
      .select('conversation_id, user_id, last_read_at')
      .in('conversation_id', convIds)
      .neq('user_id', userId);

    const otherUserIds = otherMembers?.map((m: any) => m.user_id) || [];
    let profilesData: any[] = [];
    if (otherUserIds.length > 0) {
      const { data } = await db
        .from('profiles')
        .select('id, display_name, avatar_path, last_seen')
        .in('id', otherUserIds);
      profilesData = data || [];
    }

    const { data: latestMessages } = await db
      .from('messages')
      .select('conversation_id, content, content_type, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastMsgMap: Record<string, any> = {};
    latestMessages?.forEach((m: any) => {
      if (!lastMsgMap[m.conversation_id]) {
        lastMsgMap[m.conversation_id] = m;
      }
    });

    const formatted: Conversation[] = (members || []).map((m: any) => {
      const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations;
      const other = otherMembers?.find((om: any) => om.conversation_id === m.conversation_id);
      const otherProfile = profilesData.find(p => p.id === other?.user_id);
      const lastMsg = lastMsgMap[m.conversation_id];

      return {
        id: conv.id,
        type: conv.type,
        created_at: conv.created_at,
        updated_at: lastMsg ? lastMsg.created_at : conv.updated_at,
        last_message: lastMsg ? (lastMsg.content_type === 'plaintext' ? lastMsg.content : '🔒 Encrypted Message') : undefined,
        other_member: otherProfile ? {
          id: otherProfile.id,
          display_name: otherProfile.display_name,
          avatar_path: otherProfile.avatar_path,
          last_read_at: other?.last_read_at,
          last_seen: otherProfile.last_seen
        } : undefined
      };
    });

    useChatStore.getState().setConversations(formatted);
  },

  async fetchMessages(conversationId: string) {
    const { data, error } = await db
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }) // Newest first for inverted FlatList
      .limit(50);

    if (error) {
      console.error('fetchMessages error:', error);
      return;
    }

    // Mark as sent because they came from the DB
    const msgs = (data || []).map((m: any) => ({ ...m, status: 'sent' as const }));
    useChatStore.getState().setMessages(conversationId, msgs);
  },

  async sendMessage(conversationId: string, senderId: string, content: string) {
    // 1. Optimistic Update
    const optimisticId = generateUUID();
    const optimisticMsg: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: senderId,
      content_type: 'plaintext',
      content,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    useChatStore.getState().addMessage(optimisticMsg);

    // 2. Network Request
    const { error } = await db.from('messages').insert({
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: senderId,
      content_type: 'plaintext',
      content
    });

    if (error) {
      console.error('sendMessage error:', error);
      useChatStore.getState().updateMessageStatus(optimisticId, 'error');
    } else {
      // The realtime subscription might catch this anyway, but let's confirm it locally just in case.
      useChatStore.getState().updateMessageStatus(optimisticId, 'sent');
    }
  },

  async markAsRead(conversationId: string, userId: string) {
    const now = new Date().toISOString();
    await db
      .from('conversation_members')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }
};
