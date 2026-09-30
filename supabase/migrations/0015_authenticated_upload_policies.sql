-- Recreate the authenticated storage policies after moving from preview identities to Supabase sessions.
drop policy if exists player_video_upload on storage.objects;
create policy player_video_upload on storage.objects for insert to authenticated
with check (bucket_id='player-videos' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists player_video_read on storage.objects;
create policy player_video_read on storage.objects for select to authenticated
using (bucket_id='player-videos' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin() or exists(select 1 from public.videos v where v.storage_key='supabase:'||name and exists(select 1 from public.review_requests r where r.video_id=v.id and r.professional_id=auth.uid()))));
