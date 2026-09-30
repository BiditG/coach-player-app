alter table public.profiles add column if not exists primary_goal text;
alter table public.profiles add column if not exists batting_style text;
alter table public.profiles add column if not exists bowling_style text;
alter table public.profiles add column if not exists playing_level text;
alter table public.professional_profiles add column if not exists current_academy text;
alter table public.professional_profiles add column if not exists coaching_credentials text[] not null default '{}';
alter table public.professional_profiles add column if not exists coaching_focus text[] not null default '{}';

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,role,primary_goal,batting_style,bowling_style)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce((new.raw_user_meta_data->>'role')::public.app_role,'USER'),new.raw_user_meta_data->>'primary_goal',new.raw_user_meta_data->>'batting_style',new.raw_user_meta_data->>'bowling_style')
  on conflict(id) do nothing;
  if coalesce(new.raw_user_meta_data->>'role','USER')='PROFESSIONAL' then
    insert into public.professional_profiles(user_id,headline,bio,specialties,years_experience,approved,current_academy,coaching_focus)
    values(new.id,'','',coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'specialties','[]'::jsonb))),array[]::text[]),coalesce((new.raw_user_meta_data->>'years_experience')::integer,0),true,new.raw_user_meta_data->>'current_academy',coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'specialties','[]'::jsonb))),array[]::text[]))
    on conflict(user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
