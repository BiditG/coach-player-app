-- Convert one professional service into a marketplace of up to three cricket-review gigs.
alter table public.professional_services add column if not exists gig_title text not null default 'Cricket video review';
alter table public.review_requests add column if not exists gig_id uuid references public.professional_services(id) on delete set null;

-- The original MVP used a one-service-per-professional unique constraint.
do $$
declare constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid='public.professional_services'::regclass
    and contype='u'
    and conkey=array[(select attnum from pg_attribute where attrelid='public.professional_services'::regclass and attname='professional_id')];
  if constraint_name is not null then
    execute format('alter table public.professional_services drop constraint %I', constraint_name);
  end if;
end $$;

create index if not exists professional_services_owner_idx on public.professional_services(professional_id, created_at);
create index if not exists review_requests_gig_idx on public.review_requests(gig_id);

create or replace function public.enforce_professional_gig_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.professional_services where professional_id=new.professional_id) >= 3 then
    raise exception 'A professional may publish up to three gigs.';
  end if;
  return new;
end;
$$;

drop trigger if exists professional_gig_limit on public.professional_services;
create trigger professional_gig_limit before insert on public.professional_services for each row execute procedure public.enforce_professional_gig_limit();

drop policy if exists reviews_create on public.review_requests;
create policy reviews_create on public.review_requests for insert with check(
  requester_id=auth.uid()
  and exists(select 1 from public.videos v where v.id=video_id and v.user_id=auth.uid())
  and exists(select 1 from public.professional_services s where s.id=gig_id and s.professional_id=professional_id and s.is_published)
);
