-- SprintNP stat-card feed.
-- Run this AFTER supabase/schema.sql and migrations 0003-0008.
--
-- The feed used to live entirely in the browser's localStorage. That is not a
-- data source: it is per-browser, per-device, and unreachable by any other
-- session. These tables make the feed a real, shared, RLS-governed
-- resource while keeping every derived number on the client so a stat card
-- can never disagree with the inputs that produced it.

do $$ begin
  create type public.post_kind as enum ('STAT_CARD','IMAGE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.player_role as enum ('BATSMAN','BOWLER');
exception when duplicate_object then null;
end $$;

-- A stat card post. `stats` holds only raw player inputs (runs, balls, wickets,
-- overs, ...). Derived rates are intentionally NOT stored: they are recomputed
-- from these inputs on read so a stored rate can never drift out of sync.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.post_kind not null default 'IMAGE',
  player_role public.player_role,
  caption text not null default '' check (char_length(caption) <= 2200),
  image_url text,
  stats jsonb,
  match_title text not null default '',
  match_result text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A stat card must carry a role and a stats payload; a plain image must not.
  constraint posts_stat_card_payload check (
    (kind = 'STAT_CARD' and player_role is not null and stats is not null)
    or (kind = 'IMAGE' and player_role is null and stats is null)
  )
);

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.reaction_type not null default 'FIRE',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Coach medals on a feed post, mirroring video_medals but scoped to posts.
create table if not exists public.post_medals (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  medal public.medal_type not null,
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  unique (post_id, professional_id, medal)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_idx on public.posts(user_id, created_at desc);
create index if not exists post_comments_post_idx on public.post_comments(post_id, created_at);

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts for each row execute procedure public.set_updated_at();

drop trigger if exists post_comments_updated_at on public.post_comments;
create trigger post_comments_updated_at before update on public.post_comments for each row execute procedure public.set_updated_at();

-- Only a verified professional or an admin may hand out medals.
create or replace function public.is_post_medal_giver(professional_uuid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = professional_uuid
      and p.role in ('PROFESSIONAL','ADMIN')
  );
$$;

alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.post_medals enable row level security;

-- The feed is public. Rows are written only as yourself.
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert with check (user_id = auth.uid());

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete using (user_id = auth.uid());

drop policy if exists post_reactions_read on public.post_reactions;
create policy post_reactions_read on public.post_reactions for select using (true);

drop policy if exists post_reactions_insert on public.post_reactions;
create policy post_reactions_insert on public.post_reactions for insert with check (user_id = auth.uid());

drop policy if exists post_reactions_delete on public.post_reactions;
create policy post_reactions_delete on public.post_reactions for delete using (user_id = auth.uid());

drop policy if exists post_comments_read on public.post_comments;
create policy post_comments_read on public.post_comments for select using (true);

drop policy if exists post_comments_insert on public.post_comments;
create policy post_comments_insert on public.post_comments for insert with check (user_id = auth.uid());

drop policy if exists post_comments_update on public.post_comments;
create policy post_comments_update on public.post_comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists post_comments_delete on public.post_comments;
create policy post_comments_delete on public.post_comments for delete using (user_id = auth.uid());

-- Bookmarks are private to their owner.
drop policy if exists post_bookmarks_read on public.post_bookmarks;
create policy post_bookmarks_read on public.post_bookmarks for select using (user_id = auth.uid());

drop policy if exists post_bookmarks_insert on public.post_bookmarks;
create policy post_bookmarks_insert on public.post_bookmarks for insert with check (user_id = auth.uid());

drop policy if exists post_bookmarks_delete on public.post_bookmarks;
create policy post_bookmarks_delete on public.post_bookmarks for delete using (user_id = auth.uid());

drop policy if exists post_medals_read on public.post_medals;
create policy post_medals_read on public.post_medals for select using (true);

drop policy if exists post_medals_insert on public.post_medals;
create policy post_medals_insert on public.post_medals for insert with check (is_post_medal_giver(auth.uid()));

drop policy if exists post_medals_delete on public.post_medals;
create policy post_medals_delete on public.post_medals for delete using (professional_id = auth.uid());

-- Live feed updates: new posts, fires and comments arrive without a refresh.
alter table public.posts replica identity full;
alter table public.post_reactions replica identity full;
alter table public.post_comments replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.post_reactions;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.post_comments;
exception when duplicate_object then null;
end $$;
