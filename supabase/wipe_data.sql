-- SQL script to wipe out all data across all tables in the database
-- Preserves all tables, views, functions, triggers, and RLS policies

TRUNCATE TABLE 
  public.message_reactions,
  public.message_attachments,
  public.messages,
  public.conversation_members,
  public.conversations,
  public.push_tokens,
  public.profiles
CASCADE;

-- Clear storage avatars bucket files
DELETE FROM storage.objects WHERE bucket_id = 'avatars';

-- Remove all registered users from auth.users (cascades to all user records)
DELETE FROM auth.users;
