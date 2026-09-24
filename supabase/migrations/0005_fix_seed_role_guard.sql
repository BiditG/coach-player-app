-- Apply this migration if 0004 was already run before the SQL Editor role-guard fix.
create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role then
    -- Supabase SQL Editor/migrations run with no JWT. Browser/API mutations remain protected by RLS.
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
