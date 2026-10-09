## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `display_name` | `text` |  Nullable |
| `avatar_path` | `text` |  Nullable |
| `bio` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `phone_hash` | `text` |  Nullable Unique |
| `last_seen` | `timestamptz` |  Nullable |
| `push_enabled` | `bool` |  Nullable |

## Table `conversations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `type` | `conversation_type` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `metadata` | `jsonb` |  Nullable |

## Table `conversation_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `conversation_id` | `uuid` | Primary |
| `user_id` | `uuid` | Primary |
| `role` | `conversation_role` |  |
| `joined_at` | `timestamptz` |  |
| `last_read_at` | `timestamptz` |  |

## Table `messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `conversation_id` | `uuid` |  |
| `sender_id` | `uuid` |  |
| `content_type` | `content_type` |  |
| `content` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `metadata` | `jsonb` |  Nullable |

## Table `message_attachments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `message_id` | `uuid` |  |
| `storage_path` | `text` |  |
| `mime_type` | `text` |  |
| `metadata` | `jsonb` |  Nullable |

## Table `message_reactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `message_id` | `uuid` | Primary |
| `user_id` | `uuid` | Primary |
| `reaction` | `text` | Primary |
| `created_at` | `timestamptz` |  |

## Table `push_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `token` | `text` |  Unique |
| `platform` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Custom Types / Enums

### `conversation_type`

`direct` | `group`

### `content_type`

`plaintext` | `encrypted` | `system` | `media` | `document`

### `conversation_role`

`member` | `admin`

## RLS Policies

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated users can read all profiles` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `User can insert own profile` | INSERT | public | PERMISSIVE | — | `(auth.uid() = id)` |
| `User can read own profile` | SELECT | public | PERMISSIVE | `(auth.uid() = id)` | — |
| `User can update own profile` | UPDATE | public | PERMISSIVE | `(auth.uid() = id)` | — |

### `conversations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated users can create conversations` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Users can update their conversations` | UPDATE | authenticated | PERMISSIVE | `is_conversation_member(id)` | — |
| `Users can view conversations they are in` | SELECT | authenticated | PERMISSIVE | `is_conversation_member(id)` | — |

### `conversation_members`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can insert members` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Users can update their own membership (last_read_at)` | UPDATE | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Users can view members of their conversations` | SELECT | authenticated | PERMISSIVE | `is_conversation_member(conversation_id)` | — |

### `messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can insert messages to their conversations` | INSERT | authenticated | PERMISSIVE | — | `(is_conversation_member(conversation_id) AND (sender_id = auth.uid()))` |
| `Users can only update their own messages` | UPDATE | authenticated | PERMISSIVE | `(sender_id = auth.uid())` | — |
| `Users can view messages in their conversations` | SELECT | authenticated | PERMISSIVE | `is_conversation_member(conversation_id)` | — |

### `message_attachments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can delete their own message attachments metadata` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM messages m   WHERE ((m.id = message_attachments.message_id) AND (m.sender_id = auth.uid()))))` | — |
| `Users can insert message attachments metadata` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM messages m   WHERE ((m.id = message_attachments.message_id) AND is_conversation_member(m.conversation_id) AND (m.sender_id = auth.uid()))))` |
| `Users can view message attachments metadata` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM messages m   WHERE ((m.id = message_attachments.message_id) AND is_conversation_member(m.conversation_id))))` | — |

### `push_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can delete their own push tokens` | DELETE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can insert their own push tokens` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can read their own push tokens` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can update their own push tokens` | UPDATE | public | PERMISSIVE | `true` | `(auth.uid() = user_id)` |

