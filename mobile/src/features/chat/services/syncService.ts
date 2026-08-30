import { supabase } from '../../../services/supabase/client';
import { localDb, getSyncMetadata, setSyncMetadata } from '../../../services/databaseService';
import { useChatStore } from '../store/useChatStore';

export class SyncService {
  private syncInProgress = false;
  private currentUserId: string | null = null;

  init(userId: string) {
    this.currentUserId = userId;
  }

  async performSync() {
    if (!this.currentUserId || this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      const lastSyncAt = getSyncMetadata('last_sync_at');
      const { outboxService } = require('./outboxService');
      
      const remoteSyncPromise = !lastSyncAt 
        ? this.performInitialSync() 
        : this.performIncrementalSync(lastSyncAt);
        
      const localSyncPromise = outboxService.process();

      // Concurrently check the db (remote) and local db (outbox) and sync accordingly
      await Promise.all([remoteSyncPromise, localSyncPromise]);
      
      // Update sync timestamp
      const newSyncAt = new Date().toISOString();
      setSyncMetadata('last_sync_at', newSyncAt);
      
      // Refresh UI from local DB
      await this.hydrateStoreFromLocal();

    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async performInitialSync() {
    if (!this.currentUserId) return;
    console.log('[SyncService] Performing initial sync...');

    const db = supabase as any;
    const { data: members, error } = await db
      .from('conversation_members')
      .select(`
        conversation_id,
        last_read_at,
        conversations:conversation_id (
          id, type, created_at, updated_at
        )
      `)
      .eq('user_id', this.currentUserId);

    if (error || !members) {
      console.error('[SyncService] Failed to fetch conversations', error);
      return;
    }

    const convIds = members.map((m: any) => m.conversation_id);
    if (convIds.length === 0) return;

    const { data: otherMembers } = await db
      .from('conversation_members')
      .select('conversation_id, user_id, last_read_at')
      .in('conversation_id', convIds)
      .neq('user_id', this.currentUserId);

    const otherUserIds = otherMembers?.map((m: any) => m.user_id) || [];
    let profilesData: any[] = [];
    if (otherUserIds.length > 0) {
      const { data } = await db
        .from('profiles')
        .select('id, display_name, avatar_path, last_seen')
        .in('id', otherUserIds);
      profilesData = data || [];
    }

    // Insert conversations into local SQLite
    await localDb.transaction(async (tx: any) => {
      for (const m of members) {
        const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations;
        const other = otherMembers?.find((om: any) => om.conversation_id === m.conversation_id);
        const otherProfile = profilesData.find(p => p.id === other?.user_id);
        
        await tx.execute(
          `INSERT OR REPLACE INTO local_conversations 
          (id, type, created_at, updated_at, other_member_id, other_member_name, other_member_avatar, local_avatar_path, other_member_last_seen, other_member_last_read_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            conv.id, 
            conv.type, 
            conv.created_at, 
            conv.updated_at,
            otherProfile?.id || null,
            otherProfile?.display_name || null,
            otherProfile?.avatar_path || null,
            null, // we will update local_avatar_path asynchronously
            otherProfile?.last_seen || null,
            other?.last_read_at || null
          ]
        );
      }
    });

    // Removed background downloads for avatars as per user request
    
    // Fetch latest 50 messages per conversation (for initial sync)
    // Note: A real app might do this in chunks or via an RPC.
    // For simplicity, we just fetch all messages for these convs in the last 30 days
    const { data: messages } = await db
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(500);

    if (messages && messages.length > 0) {
      await localDb.transaction(async (tx: any) => {
        for (const msg of messages) {
          await tx.execute(
            `INSERT OR REPLACE INTO local_messages (id, conversation_id, sender_id, content_type, content, local_media_path, created_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [msg.id, msg.conversation_id, msg.sender_id, msg.content_type, msg.content, null, msg.created_at, 'sent']
          );
        }
      });
      await this.updateLocalLastMessages(convIds);
      this.downloadMessagesMediaBackground(messages);
    }
  }

  private async performIncrementalSync(lastSyncAt: string) {
    if (!this.currentUserId) return;
    console.log('[SyncService] Performing incremental sync since', lastSyncAt);

    const db = supabase as any;
    // 1. Fetch any new messages
    const { data: newMessages } = await db
      .from('messages')
      .select('*')
      .gt('created_at', lastSyncAt)
      .order('created_at', { ascending: false });

    if (newMessages && newMessages.length > 0) {
      await localDb.transaction(async (tx: any) => {
        for (const msg of newMessages) {
          await tx.execute(
            `INSERT OR IGNORE INTO local_messages (id, conversation_id, sender_id, content_type, content, local_media_path, created_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [msg.id, msg.conversation_id, msg.sender_id, msg.content_type, msg.content, null, msg.created_at, 'sent']
          );
        }
      });
      const updatedConvIds: string[] = Array.from(new Set(newMessages.map((m: any) => m.conversation_id as string)));
      await this.updateLocalLastMessages(updatedConvIds);
      this.downloadMessagesMediaBackground(newMessages);
    }
    
    // We should also sync updated conversations (e.g. read receipts), but omitting for brevity right now.
  }

  private async updateLocalLastMessages(convIds: string[]) {
    // Updates the last_message column in local_conversations
    await localDb.transaction(async (tx: any) => {
      for (const convId of convIds) {
        const result = await tx.execute(
          'SELECT content, content_type, created_at FROM local_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
          [convId]
        );
        if (result.rows && result.rows.length > 0) {
          const last = result.rows[0];
          const preview = last.content_type === 'plaintext' ? last.content : '🔒 Encrypted Message';
          await tx.execute(
            'UPDATE local_conversations SET last_message = ?, updated_at = ? WHERE id = ?',
            [preview, last.created_at, convId]
          );
        }
      }
    });
  }

  private async downloadMessagesMediaBackground(messages: any[]) {
    const { mediaService } = require('../../../services/mediaService');
    
    // In our app currently, messages are content_type='plaintext', 
    // but if we support images, the 'content' might be a JSON with a remote URL, or just a URL.
    // For WhatsApp-like, assume content_type === 'image' and content is a URL or JSON.
    for (const msg of messages) {
      if (msg.content_type === 'image' && msg.content) {
        // Assume content is the URL string for now
        const localPath = await mediaService.downloadMedia(msg.content, 'jpg');
        if (localPath) {
          localDb.execute(
            'UPDATE local_messages SET local_media_path = ? WHERE id = ?',
            [localPath, msg.id]
          );
          // Update the zustand store individually if we want immediate UI feedback
          // useChatStore.getState().updateMessageMediaPath(msg.id, localPath);
        }
      }
    }
  }

  public async hydrateStoreFromLocal() {
    // Load conversations
    const convResult = localDb.execute('SELECT * FROM local_conversations ORDER BY updated_at DESC');
    const conversations = [];
    if (convResult.rows) {
      for (let i = 0; i < convResult.rows.length; i++) {
        const row = convResult.rows[i];
        conversations.push({
          id: row.id,
          type: row.type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          last_message: row.last_message,
          other_member: row.other_member_id ? {
            id: row.other_member_id,
            display_name: row.other_member_name,
            avatar_path: row.other_member_avatar,
            local_avatar_path: row.local_avatar_path,
            last_seen: row.other_member_last_seen,
            last_read_at: row.other_member_last_read_at
          } : undefined
        });
      }
    }
    useChatStore.getState().setConversations(conversations);

    // Also hydrate messages for any conversation that the UI is currently viewing
    const activeConvIds = Object.keys(useChatStore.getState().messages || {});
    for (const convId of activeConvIds) {
      this.hydrateMessagesForConversation(convId);
    }
  }

  public hydrateMessagesForConversation(conversationId: string) {
    const msgResult = localDb.execute(
      'SELECT * FROM local_messages WHERE conversation_id = ? ORDER BY created_at DESC', 
      [conversationId]
    );
    const msgs = [];
    if (msgResult.rows) {
      for (let i = 0; i < msgResult.rows.length; i++) {
        msgs.push(msgResult.rows[i]);
      }
    }
    useChatStore.getState().setMessages(conversationId, msgs);
  }
}

export const syncService = new SyncService();
