import { supabase } from '../../../services/supabase/client';
import { localDb } from '../../../services/databaseService';
import { useChatStore } from '../store/useChatStore';

export class OutboxService {
  private processing = false;

  public async enqueue(message: any) {
    // 1. Insert into outbox table
    localDb.execute(
      `INSERT INTO outbox (id, conversation_id, sender_id, content_type, content, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [message.id, message.conversation_id, message.sender_id, message.content_type, message.content, message.created_at, 'pending']
    );

    // 2. Insert into local_messages for immediate UI feedback
    localDb.execute(
      `INSERT INTO local_messages (id, conversation_id, sender_id, content_type, content, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [message.id, message.conversation_id, message.sender_id, message.content_type, message.content, message.created_at, 'sending']
    );

    // Update conversation last_message snippet
    const preview = message.content_type === 'plaintext' ? message.content : '🔒 Encrypted Message';
    localDb.execute(
      'UPDATE local_conversations SET last_message = ?, updated_at = ? WHERE id = ?',
      [preview, message.created_at, message.conversation_id]
    );

    // Update Zustand UI immediately
    useChatStore.getState().addMessage({ ...message, status: 'sending' });

    // Trigger processing
    this.process();
  }

  public async process() {
    if (this.processing) return;
    this.processing = true;

    try {
      const result = localDb.execute(`SELECT * FROM outbox WHERE status IN ('pending', 'error') ORDER BY created_at ASC`);
      
      if (!result.rows || result.rows.length === 0) {
        this.processing = false;
        return;
      }

      for (let i = 0; i < result.rows.length; i++) {
        const item = result.rows[i];
        
        // Mark as sending
        localDb.execute('UPDATE outbox SET status = ? WHERE id = ?', ['sending', item.id]);

        try {
          const db = supabase as any;
          const { error } = await db.from('messages').insert({
            id: item.id,
            conversation_id: item.conversation_id,
            sender_id: item.sender_id,
            content: item.content,
            content_type: item.content_type
          });

          // 23505 is PostgreSQL unique violation (message already exists). We treat this as success.
          if (error && error.code !== '23505') {
            throw error;
          }

          // Success! Remove from outbox
          localDb.execute('DELETE FROM outbox WHERE id = ?', [item.id]);

          // Update local_messages status to 'sent'
          localDb.execute("UPDATE local_messages SET status = 'sent' WHERE id = ?", [item.id]);

          // Update UI
          useChatStore.getState().updateMessageStatus(item.id, 'sent');

        } catch (err) {
          console.error('[OutboxService] Failed to send message', item.id, err);
          // Revert to error and increment retry_count
          localDb.execute(
            'UPDATE outbox SET status = ?, retry_count = retry_count + 1 WHERE id = ?', 
            ['error', item.id]
          );
          useChatStore.getState().updateMessageStatus(item.id, 'error');
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

export const outboxService = new OutboxService();
