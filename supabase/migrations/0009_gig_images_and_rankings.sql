-- Marketplace assets live in Supabase Storage, never on the web server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gig-images', 'gig-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "gig images are public" on storage.objects for select using (bucket_id = 'gig-images');
create policy "coaches upload their gig images" on storage.objects for insert to authenticated with check (
  bucket_id = 'gig-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "coaches update their gig images" on storage.objects for update to authenticated using (
  bucket_id = 'gig-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "coaches delete their gig images" on storage.objects for delete to authenticated using (
  bucket_id = 'gig-images' and (storage.foldername(name))[1] = auth.uid()::text
);
