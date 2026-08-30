-- Add phone_hash column to profiles
alter table public.profiles
add column phone_hash text unique;

-- Create an RPC to securely match multiple contact hashes against registered users
create or replace function public.match_contacts(contact_hashes text[])
returns table (
  id uuid,
  display_name text,
  avatar_path text,
  matched_hash text
) as $$
begin
  return query
  select 
    p.id,
    p.display_name,
    p.avatar_path,
    p.phone_hash as matched_hash
  from public.profiles p
  where p.phone_hash = any(contact_hashes);
end;
$$ language plpgsql security definer;
