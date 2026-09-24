-- Cricket-focused demo data for Framewise.
-- Prerequisites:
--   1. Run schema.sql and migrations 0003 through 0007 in numeric order.
--   2. Create two REAL, verified accounts through the app/Supabase Auth first: a player and a coach.
--   3. Replace the two values immediately below with those verified email addresses.
-- This script intentionally does NOT write to auth.users.

select set_config('app.seed_player_email', 'REPLACE_WITH_PLAYER_EMAIL', false);
select set_config('app.seed_coach_email', 'REPLACE_WITH_COACH_EMAIL', false);

do $$
declare
  player_id uuid;
  coach_id uuid;
  player_email text := current_setting('app.seed_player_email', true);
  coach_email text := current_setting('app.seed_coach_email', true);
  cover_video uuid := '10000000-0000-4000-8000-000000000001';
  nets_video uuid := '10000000-0000-4000-8000-000000000002';
  request_id uuid := '20000000-0000-4000-8000-000000000001';
  gig_id uuid := '30000000-0000-4000-8000-000000000001';
begin
  if to_regclass('public.review_timestamp_feedback') is null
     or to_regclass('public.review_requests') is null
     or to_regclass('public.professional_services') is null then
    raise exception 'Run migrations 0003 through 0007 before running this seed.';
  end if;
  if player_email like 'REPLACE_%' or coach_email like 'REPLACE_%' then
    raise exception 'Replace the two app.seed_* email values at the top of this file with verified Supabase Auth account emails.';
  end if;
  select id into player_id from public.profiles where email=player_email;
  select id into coach_id from public.profiles where email=coach_email;
  if player_id is null or coach_id is null then
    raise exception 'Each configured email must belong to an existing, verified Supabase Auth account.';
  end if;

  update public.profiles set full_name='Arjun Sharma', role='USER' where id=player_id;
  update public.profiles set full_name='Priya Desai', role='PROFESSIONAL' where id=coach_id;

  -- Keep the script re-runnable without duplicating child demo rows.
  delete from public.review_timestamp_feedback where review_request_id=request_id;
  delete from public.video_comments where video_id in (cover_video,nets_video);
  delete from public.notifications where user_id=player_id and title='Your cricket review is ready';

  insert into public.professional_profiles(user_id,headline,bio,specialties,years_experience,approved,rating,reviews_completed)
  values(coach_id,'Cricket technique coach','Former academy coach specialising in clear, practical batting and bowling feedback.',array['Batting','Bowling','Fielding','Match awareness'],11,true,4.9,128)
  on conflict(user_id) do update set headline=excluded.headline,bio=excluded.bio,specialties=excluded.specialties,years_experience=excluded.years_experience,approved=true,rating=4.9,reviews_completed=128;

  insert into public.professional_services(id,professional_id,gig_title,display_name,bio,headline,specialties,years_experience,turnaround_days,review_includes,is_published)
  values(gig_id,coach_id,'I will review your cricket batting or bowling technique','Priya Desai','A focused cricket review built around the small technical choices that make a tangible difference on match day.','Batting & bowling technique coach',array['Batting technique','Bowling action','Fielding','Game awareness'],11,2,array['Overall score','Timestamped feedback','Strengths and improvement areas','Clear practice recommendations'],true)
  on conflict(id) do update set professional_id=excluded.professional_id,gig_title=excluded.gig_title,display_name=excluded.display_name,bio=excluded.bio,headline=excluded.headline,specialties=excluded.specialties,years_experience=excluded.years_experience,turnaround_days=excluded.turnaround_days,review_includes=excluded.review_includes,is_published=true;

  -- storage_key values are development placeholders. The Feed shows its cricket poster when no matching local file exists.
  insert into public.videos(id,user_id,original_filename,storage_key,mime_type,file_size,duration_seconds,status,is_public,caption,tags)
  values
    (cover_video,player_id,'Cover drive session.mp4','demo-cover-drive.mp4','video/mp4',10485760,28,'READY',true,'Working on a quieter head position and a cleaner extension through cover.',array['cricket','batting','cover-drive','practice']),
    (nets_video,player_id,'Net bowling spell.mp4','demo-net-bowling.mp4','video/mp4',8388608,36,'READY',true,'Trying to stay tall through the crease and hit a more consistent length.',array['cricket','bowling','nets','pace'])
  on conflict(id) do update set original_filename=excluded.original_filename,storage_key=excluded.storage_key,status='READY',is_public=true,caption=excluded.caption,tags=excluded.tags;

  insert into public.review_requests(id,requester_id,professional_id,gig_id,video_id,status,focus_area,notes,overall_score,summary,strengths,improvements,recommendations,completed_at)
  values(request_id,player_id,coach_id,gig_id,cover_video,'COMPLETED','Batting technique','Please focus on balance, head position, and the follow-through.',8.4,'A composed base and good intent through cover. The next step is holding your head still for a fraction longer before committing your hands.',array['Strong initial balance','Excellent front-foot commitment','Natural timing through cover'],array['Head moves early at release','Top hand can stay softer'],array['Use a single-stump drill','Film ten repetitions from side-on','Hold your finish for two seconds'],now()-interval '1 day')
  on conflict(id) do update set status='COMPLETED',overall_score=8.4,summary=excluded.summary,strengths=excluded.strengths,improvements=excluded.improvements,recommendations=excluded.recommendations,completed_at=now()-interval '1 day';

  insert into public.review_timestamp_feedback(review_request_id,professional_id,timestamp_seconds,title,feedback,feedback_type)
  values
    (request_id,coach_id,6,'Stable base','Your weight is balanced at release. Keep this foundation as you begin the stride.','POSITIVE'),
    (request_id,coach_id,14,'Watch the head movement','Your head starts to fall toward off stump before contact. Stay taller for one more beat.','IMPROVEMENT'),
    (request_id,coach_id,22,'Excellent extension','This is your cleanest follow-through. Notice how long you hold the shape.','IMPORTANT')
  on conflict do nothing;

  insert into public.video_medals(video_id,professional_id,medal,note)
  values(cover_video,coach_id,'PRECISION','A particularly controlled cover-drive sequence.')
  on conflict(video_id,professional_id,medal) do update set note=excluded.note;

  insert into public.video_reactions(video_id,user_id,reaction)
  values(cover_video,coach_id,'INSIGHTFUL'),(nets_video,coach_id,'LIKE')
  on conflict(video_id,user_id) do update set reaction=excluded.reaction;

  insert into public.video_comments(video_id,user_id,body)
  values
    (cover_video,coach_id,'Lovely shape through cover. Keep that head quiet and you will find even more timing.'),
    (nets_video,coach_id,'Your gather is repeatable. Focus next on landing in the same corridor every ball.')
  on conflict do nothing;

  insert into public.follows(follower_id,following_id) values(player_id,coach_id),(coach_id,player_id) on conflict do nothing;
  insert into public.notifications(user_id,title,message,type,related_order_id) values(player_id,'Your cricket review is ready','Priya has completed your cover drive review.','REVIEW_COMPLETE',null) on conflict do nothing;
end $$;
