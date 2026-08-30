-- Create the trigger function that automatically creates a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_path, bio, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Anonymous User'),
    null,
    null,
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Bind the trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
