import { open } from '@op-engineering/op-sqlite';

export const localDb = open({
  name: 'veil.sqlite',
});

export const initDatabase = () => {
  try {
    localDb.execute(`
      CREATE TABLE IF NOT EXISTS local_conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_message TEXT,
        other_member_id TEXT,
        other_member_name TEXT,
        other_member_avatar TEXT,
        local_avatar_path TEXT,
        other_member_last_seen TEXT,
        other_member_last_read_at TEXT
      )
    `);

    localDb.execute(`
      CREATE TABLE IF NOT EXISTS local_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content TEXT NOT NULL,
        local_media_path TEXT,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL
      )
    `);

    localDb.execute(`CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON local_messages(conversation_id)`);
    localDb.execute(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON local_messages(created_at)`);

    localDb.execute(`
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0
      )
    `);

    localDb.execute(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Schema migrations for existing tables have been removed to prevent duplicate column errors.
    // If you are missing columns from an older install, please clear your app data or uninstall/reinstall.

    console.log('[DB] Initialized local SQLite database');
  } catch (error) {
    console.error('[DB] Initialization error:', error);
  }
};

export const getSyncMetadata = (key: string): string | null => {
  const result = localDb.execute('SELECT value FROM sync_metadata WHERE key = ?', [key]);
  if (result.rows && result.rows.length > 0) {
    return result.rows[0].value;
  }
  return null;
};

export const setSyncMetadata = (key: string, value: string) => {
  localDb.execute(
    'INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)',
    [key, value]
  );
};
