alter table public.profiles
add column last_seen timestamp with time zone default timezone('utc'::text, now());
