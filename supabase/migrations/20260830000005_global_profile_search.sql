-- Enable global read access for profiles
-- This allows users to search for other users in the Contact Discovery screen

-- 1. Create policy for authenticated users to read all profiles
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- 2. Add an index to display_name for faster searching (using gin and pg_trgm if available, or just a btree)
-- Using standard btree with text_pattern_ops since pg_trgm might require an extension
create index if not exists idx_profiles_display_name on public.profiles using btree (display_name text_pattern_ops);
