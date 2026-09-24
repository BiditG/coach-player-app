-- Self-service professional mode.
-- Run after 0003_community_marketplace.sql.
-- A USER may activate only their own PROFESSIONAL role; admin controls remain unrestricted.

create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role then
    -- SQL Editor/migration sessions do not have a JWT, so auth.uid() is null.
    -- RLS still protects normal browser requests before this trigger is reached.
    if auth.uid() is null then
      return new;
    end if;
    if public.is_admin() then
      return new;
    end if;
    if old.id = auth.uid() and old.role = 'USER' and new.role = 'PROFESSIONAL' then
      return new;
    end if;
    raise exception 'Only an account owner may activate professional mode, and only admins may make other role changes';
  end if;
  return new;
end;
$$;

-- During the MVP, any activated PROFESSIONAL account is eligible to offer a service and award medals.
create or replace function public.is_verified_professional()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('PROFESSIONAL','ADMIN'))
$$;

-- Default professional profiles are automatically marked approved for the MVP.
alter table public.professional_profiles alter column approved set default true;
