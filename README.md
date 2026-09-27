# Framewise

An elegant Next.js foundation for AI and professional video analysis. Users upload a video, request an AI or professional review, and track the resulting report.

## Stack

Next.js, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/RLS, and local development video storage.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add Supabase credentials.
3. Run `npm run dev`.

For an existing project that has already run the original schema, run `supabase/migrations/0003_community_marketplace.sql` through `supabase/migrations/0013_review_queue_backfill.sql` in numeric order in Supabase SQL Editor.

## Cricket demo seed

Run the migrations in this exact order first: `0003_community_marketplace.sql` through `0007_fiverr_style_gigs.sql`. Create two real, verified Auth accounts through `/signup`: one player and one coach. Then replace the two `REPLACE_WITH_*_EMAIL` values at the top of [cricket_demo.sql](supabase/seed/cricket_demo.sql) with those verified addresses and run it in Supabase SQL Editor. It creates a cricket player, coach gig, public cricket videos, completed review, timestamp feedback, medal, comments, reactions, follows, and notification. Demo videos display the local cricket poster until you upload real local MP4/MOV/WebM files.

## Supabase setup

1. Create a Supabase project and open **SQL Editor**.
2. Paste and run `supabase/schema.sql`.
3. In Authentication URL Configuration, add `http://localhost:3000/auth/callback` and your deployed callback URL.
4. Add the project URL and anon key to `.env.local`.
5. Create an account through `/signup`. The auth trigger creates its profile automatically.

Promote an existing account only from SQL Editor:

```sql
update public.profiles set role = 'ADMIN' where email = 'you@example.com';
```

Members can activate Professional Mode from `/profile`. RLS prevents professionals from seeing unrelated customer videos and orders.

## Local video storage

New videos upload directly to the private Supabase Storage `player-videos` bucket. Legacy development uploads in `public/uploads/` are blocked as static URLs and served only through `/api/videos/[id]` after authorization.

## Current placeholders

AI processing is still a future service seam. Private video storage, review submissions, timestamp feedback, public-feed interactions, and the professional workspace are implemented.

## Next steps

Add a thumbnail/duration worker, AI provider in `lib/ai/analyze-video.ts`, verified payment provider, and richer admin management screens.

Payment features are intentionally deferred for this MVP.

## Professional cricket reviews

The marketplace order is the source of truth for a purchased review. Checkout sets `orders.review_video_id`; migration `0012_cricket_professional_reviews.sql` creates one linked `review_requests` row when the order moves to `PENDING`. Migration `0013_review_queue_backfill.sql` repairs any prior paid orders that missed this step. A follow-up creates a new order with `parent_review_id`, then the same trigger creates a linked follow-up review. Existing standalone review rows are retained for compatibility.

### Routes

- `/professional/reviews` — coach review queue
- `/professional/reviews/[id]` — autosaving coach analysis workspace
- `/reviews` — player review list
- `/reviews/[id]` — performance report, attachments, drills, rating, medal
- `/reviews/[id]/follow-up` — new footage and follow-up checkout
- `/dashboard/development` — actual submitted score history
- `/api/videos/[id]` — authorized video delivery (redirects to a five-minute signed Storage URL for new uploads; streams legacy local video with range support)

The workspace includes discipline-specific rubrics, category scores and written analysis, timestamp markers, normalized SVG frame and image annotations, saved feedback snippets, saved drills and rubric templates, an action plan, voice/image/video attachments, and a final submission check. The report has its own layout, interactive video markers, coach notes, drills, optional medal, review rating, and follow-up comparison. Order conversations are linked from the workspace and report. Existing notifications and conversation system messages announce acceptance and submission.

### Database and security setup

For an existing database, apply migrations `0003` through `0013` in numeric order, skipping any already applied. For a fresh database, run `supabase/schema.sql` first, then `0003` through `0013`. In Supabase SQL Editor, paste and run each file separately. The final files are:

```text
supabase/migrations/0012_cricket_professional_reviews.sql
supabase/migrations/0013_review_queue_backfill.sql
```

The migration adds order/review foreign keys, rubric scores, normalized annotations, drills, review attachments, professional medals, ratings, saved snippets and templates, indexes, status/identity guards, and RLS policies. It creates private `player-videos` and `review-media` Supabase Storage buckets. Keep both buckets private. If a bucket already exists, confirm it is private and permits the listed media types. The project Storage file limit must allow the desired video size (the app caps uploads at 500 MB). No new environment variables are needed beyond `.env.example`.

New player videos and review attachments upload directly from the browser to private Supabase Storage. The app issues short-lived signed playback URLs after checking review participants. Legacy `public/uploads` requests are blocked by the proxy and served through the authorized video route. Move any existing production media out of a separately configured public CDN or storage origin before using it for paid private reviews.

The existing checkout QR is a development payment placeholder. `confirmPayment` changes the order to `PENDING` without payment-provider verification; connect a verified payment webhook before accepting real purchases. The repository's existing global Vitest and ESLint suites include unrelated stale starter checks; see test results in the implementation handoff. Apply the migration and exercise buyer/assigned coach/unrelated user RLS cases against a Supabase staging project before launch.
