-- Restore review creation and visibility after the Supabase auth migration.
drop policy if exists reviews_read on public.review_requests;
create policy reviews_read on public.review_requests for select using(requester_id=auth.uid() or professional_id=auth.uid() or public.is_admin());

create or replace function public.create_paid_review() returns trigger language plpgsql security definer set search_path=public as $$
declare review_id uuid;
begin
  if new.service_id is null or new.review_video_id is null or new.status not in ('PENDING','ACCEPTED','IN_PROGRESS','DELIVERED','COMPLETED') then return new; end if;
  insert into public.review_requests(order_id,parent_review_id,requester_id,professional_id,gig_id,video_id,focus_area,notes,discipline)
  values(new.id,new.parent_review_id,new.buyer_id,new.professional_id,new.service_id,new.review_video_id,'Gig purchase',new.requirements,'GENERAL')
  on conflict(order_id) do nothing returning id into review_id;
  if review_id is not null then
    insert into public.notifications(user_id,title,message,type)
    values(new.professional_id,'New review waiting','A player has submitted footage for your review.','REVIEW_PURCHASED');
  end if;
  return new;
end $$;
drop trigger if exists paid_review_on_order on public.orders;
create trigger paid_review_on_order after insert or update of status,review_video_id on public.orders for each row execute function public.create_paid_review();

insert into public.review_requests(order_id,parent_review_id,requester_id,professional_id,gig_id,video_id,focus_area,notes,discipline)
select o.id,o.parent_review_id,o.buyer_id,o.professional_id,o.service_id,o.review_video_id,'Gig purchase',o.requirements,'GENERAL'
from public.orders o join public.videos v on v.id=o.review_video_id and v.user_id=o.buyer_id
where o.service_id is not null and o.review_video_id is not null and o.status in ('PENDING','ACCEPTED','IN_PROGRESS','DELIVERED','COMPLETED')
on conflict(order_id) do nothing;
