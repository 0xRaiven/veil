-- Migration: 20260830000010_delete_user_account.sql
-- Function to allow an authenticated user to completely delete their account
-- Deletes the user from auth.users, which cascades to all tables across the DB

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_user_id uuid;
begin
  -- 1. Verify caller is authenticated
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Explicitly clean up push tokens
  delete from public.push_tokens where user_id = v_user_id;

  -- 3. Delete avatar storage files if any exist
  delete from storage.objects 
  where bucket_id = 'avatars' 
    and (name like (v_user_id::text || '/%'));

  -- 4. Delete the user from auth.users.
  -- This triggers ON DELETE CASCADE across:
  -- - public.profiles (references auth.users on delete cascade)
  -- - public.conversation_members (references auth.users on delete cascade)
  -- - public.messages (references auth.users on delete cascade)
  -- - public.message_reactions (references auth.users on delete cascade)
  delete from auth.users where id = v_user_id;

  -- 5. Clean up any conversations that have no members remaining
  delete from public.conversations 
  where id not in (select distinct conversation_id from public.conversation_members);
end;
$$;

-- Revoke execute from public/anon, grant only to authenticated users
revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
