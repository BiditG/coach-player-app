-- Cricket review workspace. Apply after 0011; keeps existing review IDs and orders.
-- Existing review statuses remain the source of truth. IN_REVIEW also covers drafts.

alter table public.orders add column if not exists review_video_id uuid references public.videos(id) on delete set null;
alter table public.orders add column if not exists parent_review_id uuid references public.review_requests(id) on delete set null;
alter table public.review_requests add column if not exists order_id uuid unique references public.orders(id) on delete cascade;
alter table public.review_requests add column if not exists parent_review_id uuid references public.review_requests(id) on delete set null;
alter table public.review_requests add column if not exists discipline text not null default 'GENERAL' check (discipline in ('BATTING','FAST_BOWLING','SPIN_BOWLING','WICKETKEEPING','FIELDING','GENERAL'));
alter table public.review_requests add column if not exists strongest_area text;
alter table public.review_requests add column if not exists primary_focus text;
alter table public.review_requests add column if not exists coach_closing_note text;
alter table public.review_requests add column if not exists submitted_at timestamptz;
alter table public.review_requests add column if not exists action_plan jsonb not null default '{"duration_days":7,"primary_focus":"","items":[]}'::jsonb;
create index if not exists review_parent_idx on public.review_requests(parent_review_id);
create index if not exists review_order_idx on public.review_requests(order_id);

-- Existing one-video requests remain readable. All new purchases gain an order-linked review.
create or replace function public.create_paid_review() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='PENDING' and old.status='DRAFT' and new.service_id is not null then
    if new.review_video_id is null or not exists(select 1 from public.videos v where v.id=new.review_video_id and v.user_id=new.buyer_id and v.status='READY' and v.deleted_at is null) then
      raise exception 'A ready player video is required';
    end if;
    if new.parent_review_id is not null and not exists(select 1 from public.review_requests r where r.id=new.parent_review_id and r.requester_id=new.buyer_id and r.professional_id=new.professional_id and r.status='COMPLETED') then
      raise exception 'Follow-up must reference your completed review with this coach';
    end if;
    insert into public.review_requests(order_id,parent_review_id,requester_id,professional_id,gig_id,video_id,focus_area,notes,discipline)
    values(new.id,new.parent_review_id,new.buyer_id,new.professional_id,new.service_id,new.review_video_id,'Gig purchase',new.requirements,
      coalesce((select discipline from public.review_requests where id=new.parent_review_id),'GENERAL'))
    on conflict(order_id) do nothing;
    insert into public.notifications(user_id,title,message,type)
    values(new.professional_id,case when new.parent_review_id is null then 'New review purchased' else 'New follow-up review' end,
      'A player has submitted footage for your cricket analysis.','REVIEW_PURCHASED');
  end if;
  return new;
end $$;
create trigger paid_review_on_order after update of status on public.orders for each row execute function public.create_paid_review();

create or replace function public.can_read_paid_review(review_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.review_requests r where r.id=review_uuid and (r.requester_id=auth.uid() or r.professional_id=auth.uid() or public.is_admin()))
$$;
create or replace function public.can_edit_paid_review(review_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.review_requests r where r.id=review_uuid and (r.professional_id=auth.uid() and public.is_verified_professional() or public.is_admin()) and r.status not in ('COMPLETED','DECLINED'))
$$;

-- Prevent identity reassignment and enforce a meaningful final submission, including direct API writes.
create or replace function public.guard_paid_review() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='UPDATE' then
    if (new.requester_id,new.professional_id,new.gig_id,new.video_id,new.order_id,new.parent_review_id) is distinct from
       (old.requester_id,old.professional_id,old.gig_id,old.video_id,old.order_id,old.parent_review_id) then
      raise exception 'Review participants and source cannot change';
    end if;
    if old.status='COMPLETED' and not public.is_admin() then raise exception 'Submitted review is locked'; end if;
  end if;
  if new.status='COMPLETED' and (tg_op='INSERT' or old.status is distinct from 'COMPLETED') then
    if nullif(trim(coalesce(new.summary,'')),'') is null or cardinality(new.strengths)=0 or
       (cardinality(new.improvements)=0 and cardinality(new.recommendations)=0) or
       (new.overall_score is null and not exists(select 1 from public.review_rubric_scores s where s.review_id=new.id and s.score is not null) and not exists(select 1 from public.review_timestamp_feedback f where f.review_request_id=new.id and length(trim(f.feedback))>=20)) then
      raise exception 'Summary, strength, improvement and scored or meaningful feedback are required';
    end if;
    new.submitted_at=now(); new.completed_at=now();
  end if;
  return new;
end $$;

create table public.review_rubric_scores (
 id uuid primary key default gen_random_uuid(), review_id uuid not null references public.review_requests(id) on delete cascade,
 category_key text not null, category_name text not null, sort_order integer not null default 0, enabled boolean not null default true,
 score numeric(3,1) check(score between 0 and 10), strength text, improvement text, recommendation text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(review_id,category_key));
create table public.review_annotations (
 id uuid primary key default gen_random_uuid(), review_id uuid not null references public.review_requests(id) on delete cascade,
 feedback_id uuid references public.review_timestamp_feedback(id) on delete set null, timestamp_seconds numeric(10,2) check(timestamp_seconds>=0),
 annotation_json jsonb not null default '{"objects":[]}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.coach_drills (
 id uuid primary key default gen_random_uuid(), coach_id uuid references public.profiles(id) on delete cascade,
 title text not null, category text, purpose text, instructions text not null, sets integer, reps integer, duration_minutes integer,
 equipment text, reference_url text, is_public boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.review_drills (
 id uuid primary key default gen_random_uuid(), review_id uuid not null references public.review_requests(id) on delete cascade,
 drill_id uuid references public.coach_drills(id) on delete set null, title text not null, instructions text not null,
 frequency text, target_sets integer, target_reps integer, sort_order integer not null default 0,
 completed boolean not null default false, player_notes text, created_at timestamptz not null default now());
create table public.professional_review_medals (
 id uuid primary key default gen_random_uuid(), review_id uuid not null unique references public.review_requests(id) on delete cascade,
 coach_id uuid not null references public.profiles(id), player_id uuid not null references public.profiles(id),
 medal_type text not null check(medal_type in ('TECHNICAL_EXCELLENCE','TIMING_EXCELLENCE','OUTSTANDING_CONTROL','ELITE_FOOTWORK','EXCEPTIONAL_PROGRESS','HIGH_POTENTIAL')),
 reason text not null check(length(trim(reason))>=10), awarded_at timestamptz not null default now());
create table public.review_attachments (
 id uuid primary key default gen_random_uuid(), review_id uuid not null references public.review_requests(id) on delete cascade,
 uploaded_by uuid not null references public.profiles(id), kind text not null check(kind in ('IMAGE','VIDEO','AUDIO','COACH_VIDEO')),
 storage_key text not null, mime_type text not null, duration_seconds integer, created_at timestamptz not null default now());
alter table public.review_annotations add column if not exists attachment_id uuid references public.review_attachments(id) on delete set null;
create table public.review_ratings (
 review_id uuid primary key references public.review_requests(id) on delete cascade, user_id uuid not null references public.profiles(id),
 overall_rating smallint not null check(overall_rating between 1 and 5), helpfulness_rating smallint not null check(helpfulness_rating between 1 and 5),
 clarity_rating smallint not null check(clarity_rating between 1 and 5), would_book_again boolean not null, comment text,
 created_at timestamptz not null default now());
create table public.coach_feedback_snippets (id uuid primary key default gen_random_uuid(), coach_id uuid not null references public.profiles(id) on delete cascade,title text not null,category text,content text not null,created_at timestamptz not null default now());
create table public.coach_rubric_templates (id uuid primary key default gen_random_uuid(), coach_id uuid not null references public.profiles(id) on delete cascade,title text not null,discipline text not null,categories jsonb not null,created_at timestamptz not null default now());

alter table public.review_timestamp_feedback add column if not exists category text;
alter table public.review_timestamp_feedback add column if not exists explanation text;
alter table public.review_timestamp_feedback add column if not exists correction text;
alter table public.review_timestamp_feedback add column if not exists drill_recommendation text;
alter table public.review_timestamp_feedback add column if not exists importance smallint check(importance between 1 and 3);
alter table public.review_timestamp_feedback alter column timestamp_seconds type numeric(10,2);
create index if not exists review_feedback_timeline_idx on public.review_timestamp_feedback(review_request_id,timestamp_seconds);
create index if not exists review_annotations_idx on public.review_annotations(review_id,timestamp_seconds);
create index if not exists review_scores_idx on public.review_rubric_scores(review_id,sort_order);
create index if not exists review_drills_idx on public.review_drills(review_id,sort_order);
create index if not exists review_attachments_idx on public.review_attachments(review_id,kind);
create trigger guard_paid_review_before before update on public.review_requests for each row execute function public.guard_paid_review();
create trigger review_scores_updated before update on public.review_rubric_scores for each row execute function public.set_updated_at();
create trigger review_annotations_updated before update on public.review_annotations for each row execute function public.set_updated_at();

-- Existing broad policies are narrowed so an assigned, approved coach owns all coach-only content.
drop policy if exists reviews_create on public.review_requests;
drop policy if exists reviews_requester_update on public.review_requests;
drop policy if exists reviews_professional_update on public.review_requests;
create policy paid_reviews_coach_update on public.review_requests for update using(professional_id=auth.uid() and public.is_verified_professional() and status<>'COMPLETED') with check(professional_id=auth.uid() and public.is_verified_professional());
drop policy if exists review_feedback_write on public.review_timestamp_feedback;
create policy paid_feedback_insert on public.review_timestamp_feedback for insert with check(professional_id=auth.uid() and public.can_edit_paid_review(review_request_id));
create policy paid_feedback_update on public.review_timestamp_feedback for update using(professional_id=auth.uid() and public.can_edit_paid_review(review_request_id)) with check(professional_id=auth.uid() and public.can_edit_paid_review(review_request_id));
create policy paid_feedback_delete on public.review_timestamp_feedback for delete using(professional_id=auth.uid() and public.can_edit_paid_review(review_request_id));

alter table public.review_rubric_scores enable row level security;
alter table public.review_annotations enable row level security;
alter table public.coach_drills enable row level security;
alter table public.review_drills enable row level security;
alter table public.professional_review_medals enable row level security;
alter table public.review_attachments enable row level security;
alter table public.review_ratings enable row level security;
alter table public.coach_feedback_snippets enable row level security;
alter table public.coach_rubric_templates enable row level security;
create policy rubric_read on public.review_rubric_scores for select using(public.can_read_paid_review(review_id));
create policy rubric_write on public.review_rubric_scores for all using(public.can_edit_paid_review(review_id)) with check(public.can_edit_paid_review(review_id));
create policy annotations_read on public.review_annotations for select using(public.can_read_paid_review(review_id));
create policy annotations_write on public.review_annotations for all using(public.can_edit_paid_review(review_id)) with check(public.can_edit_paid_review(review_id));
create policy drills_read on public.coach_drills for select using(is_public or coach_id=auth.uid() or public.is_admin());
create policy drills_write on public.coach_drills for all using(coach_id=auth.uid() and public.is_verified_professional()) with check(coach_id=auth.uid() and public.is_verified_professional());
create policy assigned_drills_read on public.review_drills for select using(public.can_read_paid_review(review_id));
create policy assigned_drills_write on public.review_drills for all using(public.can_edit_paid_review(review_id)) with check(public.can_edit_paid_review(review_id));
create policy assigned_drills_player_update on public.review_drills for update using(exists(select 1 from public.review_requests r where r.id=review_id and r.requester_id=auth.uid() and r.status='COMPLETED')) with check(exists(select 1 from public.review_requests r where r.id=review_id and r.requester_id=auth.uid() and r.status='COMPLETED'));
create policy review_medals_read on public.professional_review_medals for select using(public.can_read_paid_review(review_id));
create policy review_medals_award on public.professional_review_medals for insert with check(coach_id=auth.uid() and public.is_verified_professional() and exists(select 1 from public.review_requests r where r.id=review_id and r.professional_id=coach_id and r.requester_id=player_id and r.status='COMPLETED'));
create policy attachments_read on public.review_attachments for select using(public.can_read_paid_review(review_id));
create policy attachments_insert on public.review_attachments for insert with check(uploaded_by=auth.uid() and exists(select 1 from public.review_requests r where r.id=review_id and (r.requester_id=auth.uid() or (r.professional_id=auth.uid() and public.is_verified_professional()))));
create policy ratings_read on public.review_ratings for select using(public.can_read_paid_review(review_id));
create policy ratings_insert on public.review_ratings for insert with check(user_id=auth.uid() and exists(select 1 from public.review_requests r where r.id=review_id and r.requester_id=auth.uid() and r.order_id is not null and r.status='COMPLETED'));
create policy snippets_owner on public.coach_feedback_snippets for all using(coach_id=auth.uid() and public.is_verified_professional()) with check(coach_id=auth.uid() and public.is_verified_professional());
create policy templates_owner on public.coach_rubric_templates for all using(coach_id=auth.uid() and public.is_verified_professional()) with check(coach_id=auth.uid() and public.is_verified_professional());

-- Prevent players changing coach-assigned drill content through the permitted completion update.
create or replace function public.guard_drill_completion() returns trigger language plpgsql as $$
begin
 if auth.uid() is not null and auth.uid()<> (select professional_id from public.review_requests where id=new.review_id) and not public.is_admin() then
   if (new.review_id,new.drill_id,new.title,new.instructions,new.frequency,new.target_sets,new.target_reps,new.sort_order) is distinct from
      (old.review_id,old.drill_id,old.title,old.instructions,old.frequency,old.target_sets,old.target_reps,old.sort_order) then
     raise exception 'Players may only update drill completion and notes';
   end if;
 end if;
 return new;
end $$;
create trigger guard_review_drill_update before update on public.review_drills for each row execute function public.guard_drill_completion();

-- Notify through existing notification and order conversation tables.
create or replace function public.review_status_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare convo uuid;
begin
 if old.status is distinct from new.status then
   if new.status='COMPLETED' then
     insert into public.notifications(user_id,title,message,type) values(new.requester_id,'Your professional review is ready','Open your cricket performance report.','REVIEW_COMPLETE');
     update public.orders set status='DELIVERED',delivered_at=now() where id=new.order_id and status in ('PENDING','ACCEPTED','IN_PROGRESS','REVISION_REQUESTED');
   elsif new.status='ACCEPTED' then
     insert into public.notifications(user_id,title,message,type) values(new.requester_id,'Review accepted','Your coach has accepted your review.','REVIEW_ACCEPTED');
   end if;
   select id into convo from public.conversations where order_id=new.order_id;
   if convo is not null and new.status in ('ACCEPTED','COMPLETED') then
     insert into public.messages(conversation_id,kind,body) values(convo,'SYSTEM',case new.status when 'ACCEPTED' then 'Review accepted' else 'Review submitted' end);
   end if;
 end if;
 return new;
end $$;
create trigger review_status_activity_after after update of status on public.review_requests for each row execute function public.review_status_activity();

-- Private object storage for review images, voice notes, and coach video responses.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('review-media','review-media',false,524288000,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/webm'])
on conflict(id) do nothing;
create policy review_media_read on storage.objects for select to authenticated
using(bucket_id='review-media' and public.can_read_paid_review((storage.foldername(name))[1]::uuid));
create policy review_media_upload on storage.objects for insert to authenticated
with check(bucket_id='review-media' and public.can_read_paid_review((storage.foldername(name))[1]::uuid));

create or replace function public.guard_review_attachment() returns trigger language plpgsql as $$
declare r public.review_requests;
begin
 select * into r from public.review_requests where id=new.review_id;
 if r.id is null or split_part(new.storage_key,'/',1)<>new.review_id::text or
    (new.kind='COACH_VIDEO' and new.uploaded_by<>r.professional_id) or
    (new.uploaded_by<>r.requester_id and new.uploaded_by<>r.professional_id) then
   raise exception 'Invalid review attachment';
 end if;
 return new;
end $$;
create trigger guard_review_attachment_before before insert on public.review_attachments for each row execute function public.guard_review_attachment();

-- Player sees timestamp feedback only after the report is submitted.
drop policy if exists review_feedback_read on public.review_timestamp_feedback;
create policy paid_feedback_read on public.review_timestamp_feedback for select using(
 public.is_admin() or public.is_review_professional(review_request_id) or
 exists(select 1 from public.review_requests r where r.id=review_request_id and r.requester_id=auth.uid() and r.status='COMPLETED'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('player-videos','player-videos',false,524288000,array['video/mp4','video/quicktime','video/webm'])
on conflict(id) do nothing;
create policy player_video_upload on storage.objects for insert to authenticated
with check(bucket_id='player-videos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy player_video_read on storage.objects for select to authenticated
using(bucket_id='player-videos' and (
 (storage.foldername(name))[1]=auth.uid()::text or
 exists(select 1 from public.videos v where v.storage_key='supabase:'||name and
   (v.is_public or exists(select 1 from public.review_requests r where r.video_id=v.id and r.professional_id=auth.uid())))
));

-- Review authors must be approved in the existing professional profile, not merely hold a role.
create or replace function public.is_approved_review_coach() returns boolean language sql stable security definer set search_path=public as $$
 select public.is_admin() or exists(select 1 from public.professional_profiles p where p.user_id=auth.uid() and p.approved)
$$;
create or replace function public.can_edit_paid_review(review_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.review_requests r where r.id=review_uuid and (r.professional_id=auth.uid() and public.is_approved_review_coach() or public.is_admin()) and r.status not in ('COMPLETED','DECLINED'))
$$;
drop policy if exists paid_reviews_coach_update on public.review_requests;
create policy paid_reviews_coach_update on public.review_requests for update using(professional_id=auth.uid() and public.is_approved_review_coach() and status<>'COMPLETED') with check(professional_id=auth.uid() and public.is_approved_review_coach());
drop policy if exists review_medals_award on public.professional_review_medals;
create policy review_medals_award on public.professional_review_medals for insert with check(coach_id=auth.uid() and public.is_approved_review_coach() and exists(select 1 from public.review_requests r where r.id=review_id and r.professional_id=coach_id and r.requester_id=player_id and r.status='COMPLETED'));

-- Purchased-order identity and source are immutable once checkout begins.
create or replace function public.guard_review_order() returns trigger language plpgsql as $$
begin
 if (new.buyer_id,new.professional_id,new.service_id,new.package_id,new.product_id,new.subtotal_cents,new.total_cents,new.parent_review_id) is distinct from
    (old.buyer_id,old.professional_id,old.service_id,old.package_id,old.product_id,old.subtotal_cents,old.total_cents,old.parent_review_id) then
   raise exception 'Order participants, service and price cannot change';
 end if;
 if old.status<>'DRAFT' and new.review_video_id is distinct from old.review_video_id then
   raise exception 'Submitted review video cannot change';
 end if;
 if new.status is distinct from old.status and auth.uid()=old.buyer_id and
    not ((old.status='DRAFT' and new.status in ('PENDING','CANCELLED')) or
         (old.status='DELIVERED' and new.status='COMPLETED')) then
   raise exception 'Invalid buyer order transition';
 end if;
 return new;
end $$;
create trigger guard_review_order_before before update on public.orders for each row execute function public.guard_review_order();

-- Coach-authored work stays private to the coach until final submission.
create or replace function public.can_read_review_output(review_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.review_requests r where r.id=review_uuid and
   (r.professional_id=auth.uid() or public.is_admin() or (r.requester_id=auth.uid() and r.status='COMPLETED')))
$$;
drop policy if exists rubric_read on public.review_rubric_scores;
create policy rubric_read on public.review_rubric_scores for select using(public.can_read_review_output(review_id));
drop policy if exists annotations_read on public.review_annotations;
create policy annotations_read on public.review_annotations for select using(public.can_read_review_output(review_id));
drop policy if exists assigned_drills_read on public.review_drills;
create policy assigned_drills_read on public.review_drills for select using(public.can_read_review_output(review_id));
drop policy if exists attachments_read on public.review_attachments;
create policy attachments_read on public.review_attachments for select using(
 exists(select 1 from public.review_requests r where r.id=review_id and
   (public.is_admin() or r.professional_id=auth.uid() or
    (r.requester_id=auth.uid() and (uploaded_by=auth.uid() or r.status='COMPLETED')))));
drop policy if exists review_media_read on storage.objects;
create policy review_media_read on storage.objects for select to authenticated using(
 bucket_id='review-media' and exists(
  select 1 from public.review_attachments a join public.review_requests r on r.id=a.review_id
  where a.storage_key=name and (public.is_admin() or r.professional_id=auth.uid() or
     (r.requester_id=auth.uid() and (a.uploaded_by=auth.uid() or r.status='COMPLETED')))));

drop policy if exists player_video_read on storage.objects;
create policy player_video_read on storage.objects for select to authenticated using(
 bucket_id='player-videos' and (public.is_admin() or (storage.foldername(name))[1]=auth.uid()::text or
 exists(select 1 from public.videos v where v.storage_key='supabase:'||name and
   (v.is_public or exists(select 1 from public.review_requests r where r.video_id=v.id and r.professional_id=auth.uid())))));

create policy review_medals_admin on public.professional_review_medals for all using(public.is_admin()) with check(public.is_admin());
create policy review_attachments_admin on public.review_attachments for all using(public.is_admin()) with check(public.is_admin());
create policy review_ratings_admin on public.review_ratings for all using(public.is_admin()) with check(public.is_admin());

insert into public.coach_drills(coach_id,title,category,purpose,instructions,sets,reps,equipment,is_public) values
 (null,'Front Foot Cone Alignment','BATTING','Improve front-foot direction','Place a cone just outside the front foot and step directly toward the ball while keeping the head over the front knee.',3,12,'One cone and a bat',true),
 (null,'Seam Release Target','FAST_BOWLING','Improve wrist position and seam consistency','Bowl from a shortened run-up toward a marked target while holding the wrist upright through release.',4,6,'Ball and target marker',true),
 (null,'Spin Flight Control','SPIN_BOWLING','Control length and flight','Bowl sets of six at a target length, varying flight while keeping the same landing area.',4,6,'Balls and target mat',true),
 (null,'Keeper Lateral Collection','WICKETKEEPING','Improve footwork and soft hands','Start in a balanced stance and move laterally to collect feeds outside each shoulder without reaching across the body.',3,10,'Gloves and feeder',true),
 (null,'Ground Field and Release','FIELDING','Improve clean pickup and release speed','Attack a rolling ball, field outside the lead foot, and release toward a single-stump target.',3,10,'Ball and stump',true);
