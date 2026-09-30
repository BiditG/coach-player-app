-- Make paid review creation reliable for both new and previously paid orders.
create or replace function public.create_paid_review() returns trigger language plpgsql security definer set search_path=public as $$
declare
  created_review uuid;
begin
  if new.service_id is null or new.review_video_id is null or new.status not in ('PENDING','ACCEPTED','IN_PROGRESS','DELIVERED','COMPLETED') then
    return new;
  end if;

  if not exists (
    select 1 from public.videos v
    where v.id=new.review_video_id and v.user_id=new.buyer_id and v.status='READY' and v.deleted_at is null
  ) then
    raise exception 'A ready player video is required';
  end if;

  if new.parent_review_id is not null and not exists (
    select 1 from public.review_requests r
    where r.id=new.parent_review_id and r.requester_id=new.buyer_id and r.professional_id=new.professional_id and r.status='COMPLETED'
  ) then
    raise exception 'Follow-up must reference your completed review with this coach';
  end if;

  insert into public.review_requests(order_id,parent_review_id,requester_id,professional_id,gig_id,video_id,focus_area,notes,discipline)
  values(
    new.id,
    new.parent_review_id,
    new.buyer_id,
    new.professional_id,
    new.service_id,
    new.review_video_id,
    'Gig purchase',
    new.requirements,
    coalesce((select discipline from public.review_requests where id=new.parent_review_id),'GENERAL')
  )
  on conflict(order_id) do nothing
  returning id into created_review;

  if created_review is not null then
    insert into public.notifications(user_id,title,message,type)
    values(
      new.professional_id,
      case when new.parent_review_id is null then 'New review purchased' else 'New follow-up review' end,
      'A player has submitted footage for your cricket analysis.',
      'REVIEW_PURCHASED'
    );
  end if;

  return new;
end $$;

drop trigger if exists paid_review_on_order on public.orders;
create trigger paid_review_on_order
after insert or update of status,review_video_id on public.orders
for each row execute function public.create_paid_review();

-- Orders paid before the trigger was fixed are added to the coach queue once.
insert into public.review_requests(order_id,parent_review_id,requester_id,professional_id,gig_id,video_id,focus_area,notes,discipline)
select
  o.id,
  o.parent_review_id,
  o.buyer_id,
  o.professional_id,
  o.service_id,
  o.review_video_id,
  'Gig purchase',
  o.requirements,
  coalesce((select discipline from public.review_requests where id=o.parent_review_id),'GENERAL')
from public.orders o
join public.videos v on v.id=o.review_video_id and v.user_id=o.buyer_id and v.status='READY' and v.deleted_at is null
where o.service_id is not null
  and o.review_video_id is not null
  and o.status in ('PENDING','ACCEPTED','IN_PROGRESS','DELIVERED','COMPLETED')
on conflict(order_id) do nothing;
