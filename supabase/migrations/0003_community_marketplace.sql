-- Framewise community + professional marketplace migration.
-- Run this AFTER the original supabase/schema.sql has already been applied.
-- It only adds the new community/marketplace structures; it does not recreate base tables.

do $$ begin
  create type public.review_request_status as enum ('REQUESTED','ACCEPTED','IN_REVIEW','COMPLETED','DECLINED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reaction_type as enum ('LIKE','INSIGHTFUL','FIRE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.medal_type as enum ('PRECISION','PROGRESS','CONSISTENCY','CRAFT');
exception when duplicate_object then null;
end $$;

-- Public-feed metadata remains attached to the existing videos table.
alter table public.videos add column if not exists is_public boolean not null default false;
alter table public.videos add column if not exists caption text;
alter table public.videos add column if not exists tags text[] not null default '{}';

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.video_reactions (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.reaction_type not null default 'LIKE',
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_medals (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  medal public.medal_type not null,
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  unique (video_id, professional_id, medal)
);

create table if not exists public.professional_services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  bio text not null default '',
  photo_url text,
  headline text not null default '',
  specialties text[] not null default '{}',
  years_experience integer not null default 0 check (years_experience >= 0),
  turnaround_days integer not null default 3 check (turnaround_days between 1 and 30),
  review_includes text[] not null default '{}',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete restrict,
  video_id uuid not null references public.videos(id) on delete restrict,
  status public.review_request_status not null default 'REQUESTED',
  focus_area text,
  notes text,
  overall_score numeric(3,1) check (overall_score between 0 and 10),
  summary text,
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  recommendations text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.review_timestamp_feedback (
  id uuid primary key default gen_random_uuid(),
  review_request_id uuid not null references public.review_requests(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  timestamp_seconds integer not null check (timestamp_seconds >= 0),
  title text not null,
  feedback text not null,
  feedback_type public.comment_type not null default 'GENERAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_videos_idx on public.videos(created_at desc) where is_public and deleted_at is null;
create index if not exists reviews_requester_idx on public.review_requests(requester_id, status);
create index if not exists reviews_professional_idx on public.review_requests(professional_id, status);
create index if not exists comments_video_idx on public.video_comments(video_id, created_at);
create index if not exists medals_video_idx on public.video_medals(video_id);

-- Reuse the timestamp function created by the base schema.
drop trigger if exists services_updated on public.professional_services;
create trigger services_updated before update on public.professional_services for each row execute procedure public.set_updated_at();
drop trigger if exists video_comments_updated on public.video_comments;
create trigger video_comments_updated before update on public.video_comments for each row execute procedure public.set_updated_at();
drop trigger if exists review_requests_updated on public.review_requests;
create trigger review_requests_updated before update on public.review_requests for each row execute procedure public.set_updated_at();
drop trigger if exists review_feedback_updated on public.review_timestamp_feedback;
create trigger review_feedback_updated before update on public.review_timestamp_feedback for each row execute procedure public.set_updated_at();

create or replace function public.is_verified_professional()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.professional_profiles where user_id=auth.uid() and approved)
$$;

create or replace function public.is_review_professional(review_uuid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.review_requests where id=review_uuid and professional_id=auth.uid())
$$;

alter table public.follows enable row level security;
alter table public.video_reactions enable row level security;
alter table public.video_comments enable row level security;
alter table public.video_medals enable row level security;
alter table public.professional_services enable row level security;
alter table public.review_requests enable row level security;
alter table public.review_timestamp_feedback enable row level security;

-- The original private-video policy stays intact. This policy additionally grants feed access only to public videos.
drop policy if exists public_or_owned_videos_read on public.videos;
create policy public_or_owned_videos_read on public.videos for select using (
  is_public or user_id=auth.uid() or public.is_admin() or exists(select 1 from public.review_requests r where r.video_id=id and r.professional_id=auth.uid())
);

drop policy if exists follows_read on public.follows; create policy follows_read on public.follows for select using(true);
drop policy if exists follows_write on public.follows; create policy follows_write on public.follows for insert with check(follower_id=auth.uid());
drop policy if exists follows_delete on public.follows; create policy follows_delete on public.follows for delete using(follower_id=auth.uid());
drop policy if exists reactions_read on public.video_reactions; create policy reactions_read on public.video_reactions for select using(true);
drop policy if exists reactions_write on public.video_reactions; create policy reactions_write on public.video_reactions for insert with check(user_id=auth.uid());
drop policy if exists reactions_update on public.video_reactions; create policy reactions_update on public.video_reactions for update using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists reactions_delete on public.video_reactions; create policy reactions_delete on public.video_reactions for delete using(user_id=auth.uid());
drop policy if exists public_comments_read on public.video_comments; create policy public_comments_read on public.video_comments for select using(exists(select 1 from public.videos v where v.id=video_id and (v.is_public or v.user_id=auth.uid() or public.is_admin())));
drop policy if exists comments_create on public.video_comments; create policy comments_create on public.video_comments for insert with check(user_id=auth.uid() and exists(select 1 from public.videos v where v.id=video_id and v.is_public));
drop policy if exists comments_manage on public.video_comments; create policy comments_manage on public.video_comments for update using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
drop policy if exists comments_remove on public.video_comments; create policy comments_remove on public.video_comments for delete using(user_id=auth.uid() or public.is_admin());
drop policy if exists medals_read on public.video_medals; create policy medals_read on public.video_medals for select using(true);
drop policy if exists medals_award on public.video_medals; create policy medals_award on public.video_medals for insert with check(professional_id=auth.uid() and public.is_verified_professional() and exists(select 1 from public.videos v where v.id=video_id and v.is_public));
drop policy if exists medals_remove on public.video_medals; create policy medals_remove on public.video_medals for delete using(professional_id=auth.uid() or public.is_admin());
drop policy if exists services_read on public.professional_services; create policy services_read on public.professional_services for select using(is_published or professional_id=auth.uid() or public.is_admin());
drop policy if exists services_create on public.professional_services; create policy services_create on public.professional_services for insert with check(professional_id=auth.uid() and public.is_verified_professional());
drop policy if exists services_update on public.professional_services; create policy services_update on public.professional_services for update using(professional_id=auth.uid() or public.is_admin()) with check(professional_id=auth.uid() or public.is_admin());
drop policy if exists reviews_read on public.review_requests; create policy reviews_read on public.review_requests for select using(requester_id=auth.uid() or professional_id=auth.uid() or public.is_admin());
drop policy if exists reviews_create on public.review_requests; create policy reviews_create on public.review_requests for insert with check(requester_id=auth.uid() and exists(select 1 from public.videos v where v.id=video_id and v.user_id=auth.uid()) and exists(select 1 from public.professional_services s where s.professional_id=professional_id and s.is_published));
drop policy if exists reviews_requester_update on public.review_requests; create policy reviews_requester_update on public.review_requests for update using(requester_id=auth.uid() and status='REQUESTED') with check(requester_id=auth.uid() and status='REQUESTED');
drop policy if exists reviews_professional_update on public.review_requests; create policy reviews_professional_update on public.review_requests for update using(professional_id=auth.uid() or public.is_admin()) with check(professional_id=auth.uid() or public.is_admin());
drop policy if exists review_feedback_read on public.review_timestamp_feedback; create policy review_feedback_read on public.review_timestamp_feedback for select using(public.is_review_professional(review_request_id) or exists(select 1 from public.review_requests r where r.id=review_request_id and r.requester_id=auth.uid()) or public.is_admin());
drop policy if exists review_feedback_write on public.review_timestamp_feedback; create policy review_feedback_write on public.review_timestamp_feedback for all using(public.is_review_professional(review_request_id) or public.is_admin()) with check(public.is_review_professional(review_request_id) or public.is_admin());

-- Admin retains full control across all new records.
drop policy if exists admin_follows on public.follows; create policy admin_follows on public.follows for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists admin_reactions on public.video_reactions; create policy admin_reactions on public.video_reactions for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists admin_comments on public.video_comments; create policy admin_comments on public.video_comments for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists admin_medals on public.video_medals; create policy admin_medals on public.video_medals for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists admin_services on public.professional_services; create policy admin_services on public.professional_services for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists admin_reviews on public.review_requests; create policy admin_reviews on public.review_requests for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists admin_review_feedback on public.review_timestamp_feedback; create policy admin_review_feedback on public.review_timestamp_feedback for all using(public.is_admin()) with check(public.is_admin());
