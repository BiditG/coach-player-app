-- Run after 0008_marketplace_orders_messages.sql, which creates marketplace_reviews.
create or replace function public.refresh_professional_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.professional_profiles pp
  set rating = summary.average_rating,
      reviews_completed = summary.review_count
  from (
    select professional_id, round(avg(rating)::numeric, 2) as average_rating, count(*)::integer as review_count
    from public.marketplace_reviews
    where professional_id = coalesce(new.professional_id, old.professional_id)
    group by professional_id
  ) summary
  where pp.user_id = summary.professional_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists marketplace_review_rating_refresh on public.marketplace_reviews;
create trigger marketplace_review_rating_refresh
after insert or update or delete on public.marketplace_reviews
for each row execute procedure public.refresh_professional_rating();

create index if not exists professional_profiles_rating_idx
  on public.professional_profiles(rating desc nulls last, reviews_completed desc);
