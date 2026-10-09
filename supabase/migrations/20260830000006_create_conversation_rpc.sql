create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  v_current_user_id uuid;
begin
  v_current_user_id := auth.uid();
  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Self conversation (Note to Self / This Device)
  if other_user_id = v_current_user_id then
    select c.id into conv_id
    from public.conversations c
    join public.conversation_members m on c.id = m.conversation_id
    where c.type = 'direct'
      and m.user_id = v_current_user_id
    group by c.id
    having count(m.user_id) = 1;

    if conv_id is not null then
      return conv_id;
    end if;

    insert into public.conversations (type) values ('direct') returning id into conv_id;
    insert into public.conversation_members (conversation_id, user_id) 
    values (conv_id, v_current_user_id)
    on conflict (conversation_id, user_id) do nothing;

    return conv_id;
  end if;

  -- 2. Direct conversation with another user
  select c.id into conv_id
  from public.conversations c
  join public.conversation_members m1 on c.id = m1.conversation_id
  join public.conversation_members m2 on c.id = m2.conversation_id
  where c.type = 'direct'
    and m1.user_id = v_current_user_id
    and m2.user_id = other_user_id
    and m1.user_id != m2.user_id;

  if conv_id is not null then
    return conv_id;
  end if;

  -- 3. Create new conversation and insert both members safely
  insert into public.conversations (type) values ('direct') returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (conv_id, v_current_user_id),
    (conv_id, other_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return conv_id;
end;
$$;
