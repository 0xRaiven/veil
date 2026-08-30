-- Create 'avatars' storage bucket
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Enable RLS on storage.objects
-- Note: Supabase storage tables already have RLS enabled by default, but it's safe to restate.

-- Policy: Allow authenticated users to view avatars
create policy "Authenticated users can view avatars"
on storage.objects for select
to authenticated
using ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to update their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
);
