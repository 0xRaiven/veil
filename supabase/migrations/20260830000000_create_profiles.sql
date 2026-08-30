-- Create the profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  display_name text,
  avatar_path text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: User can read own profile
create policy "User can read own profile"
  on public.profiles for select
  using ( auth.uid() = id );

-- Policy: User can insert own profile
create policy "User can insert own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Policy: User can update own profile
create policy "User can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Note: We omit DELETE policy as profile deletion is handled via auth.users cascade.
-- Modifying another user's profile is implicitly denied by the restrictive 'using' conditions above.
