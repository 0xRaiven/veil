create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  -- 1. Check if direct conversation already exists between these two users
  select c.id into conv_id
  from conversations c
  join conversation_members m1 on c.id = m1.conversation_id
  join conversation_members m2 on c.id = m2.conversation_id
  where c.type = 'direct'
    and m1.user_id = auth.uid()
    and m2.user_id = other_user_id;

  -- 2. If it exists, return it
  if conv_id is not null then
    return conv_id;
  end if;

  -- 3. If not, create a new conversation
  insert into conversations (type) values ('direct') returning id into conv_id;

  -- 4. Insert both members
  insert into conversation_members (conversation_id, user_id)
  values
    (conv_id, auth.uid()),
    (conv_id, other_user_id);

  return conv_id;
end;
$$;
