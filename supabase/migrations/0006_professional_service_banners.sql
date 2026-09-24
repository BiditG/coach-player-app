-- Local/professional service banner support.
alter table public.professional_services add column if not exists banner_url text;
