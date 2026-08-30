create or replace function public.update_conversation_on_message()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = timezone('utc'::text, now())
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.update_conversation_on_message();
