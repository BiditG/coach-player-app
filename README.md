# Framewise

An elegant Next.js foundation for AI and professional video analysis. Users upload a video, request an AI or professional review, and track the resulting report.

## Stack

Next.js, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/RLS, and local development video storage.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add Supabase credentials.
3. Run `npm run dev`.

For an existing project that has already run the original schema, run `supabase/migrations/0003_community_marketplace.sql` through `supabase/migrations/0008_marketplace_orders_messages.sql` in numeric order in Supabase SQL Editor.

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

For development, uploaded videos are saved in `public/uploads/` and served directly by Next.js. The directory is intentionally local and should not be treated as production-grade persistent storage. A remote storage adapter can be introduced later.

## Current placeholders

AI processing is still a future service seam. Local video storage, review submissions, timestamp feedback, public-feed interactions, and the professional workspace are implemented for development.

## Next steps

Add remote storage, a thumbnail/duration worker, AI provider in `lib/ai/analyze-video.ts`, and richer admin management screens.

Payment features are intentionally deferred for this MVP.
