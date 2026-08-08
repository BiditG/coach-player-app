-- Enable Row Level Security on every public-schema table that is currently
-- reachable, cross-tenant, through Supabase's auto-exposed PostgREST API
-- using the public anon/authenticated key (see lib/supabase/server.ts,
-- lib/supabase/middleware.ts). Supabase's bootstrap grants ALL privileges
-- on public-schema tables to `anon`/`authenticated` by default — RLS is the
-- only thing standing between an anonymous HTTP caller and every tenant's
-- rows once that grant exists.
--
-- This migration does NOT affect the application's own data access: server
-- actions/queries in this project go through lib/db/drizzle.ts, a direct
-- Postgres connection (POSTGRES_URL) that bypasses RLS entirely (it does
-- not run as `anon`/`authenticated`). Only the PostgREST/anon-key vector is
-- closed here. The `handle_new_user` trigger (0001) is SECURITY DEFINER and
-- also bypasses RLS, so signup keeps working unmodified.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Helper: the caller's own team ids. A policy on `team_members` cannot
-- subquery `team_members` itself directly — Postgres raises "infinite
-- recursion detected in policy for relation team_members" — so the lookup
-- is wrapped in a SECURITY DEFINER function instead. SECURITY DEFINER makes
-- the internal SELECT run as the function owner, which bypasses RLS for
-- that one lookup only; every caller-facing query that consumes this
-- function's result stays fully subject to RLS.
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.get_my_team_ids() TO authenticated;
--> statement-breakpoint

-- users: visible to yourself and to teammates (dashboard member list);
-- mutable only by yourself. No INSERT policy — rows are created exclusively
-- by the handle_new_user SECURITY DEFINER trigger (bypasses RLS), so
-- PostgREST/anon-key INSERT stays denied by the RLS default-deny.
CREATE POLICY "users_select_self_or_teammate" ON "users"
  FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM team_members
      WHERE team_id IN (SELECT public.get_my_team_ids())
    )
  );
--> statement-breakpoint

-- No UPDATE/DELETE policy on `users` via PostgREST: the app writes user rows
-- through its direct DB connection (bypasses RLS), so client writes via the
-- anon key are never legitimate. Leaving UPDATE/DELETE to the RLS default-deny
-- stops a client from self-editing role/email or self-deleting (which would
-- bypass the app's reauth / soft-delete / audit flow) using the public key.
--> statement-breakpoint

-- IMPORTANT — these four tables are SELECT-only via PostgREST (anon key).
-- All writes (create team, invite, change role, log activity…) go exclusively
-- through the app's direct DB connection (bypasses RLS) and are authorized in
-- the server actions (e.g. owner-role gate in app/(login)/actions.ts). Making
-- the client-facing policies FOR ALL would let ANY authenticated member PATCH
-- their own role to 'owner', delete the owner, or flip their team's
-- subscription to active — all via the public anon key, bypassing every server
-- action gate. Hence FOR SELECT only.

-- teams: readable by members; writes go through the app (direct DB).
CREATE POLICY "teams_tenant_isolation" ON "teams"
  FOR SELECT
  USING (id IN (SELECT public.get_my_team_ids()));
--> statement-breakpoint

-- team_members: readable by members (scoped via the SECURITY DEFINER helper to
-- avoid self-referential RLS recursion); role changes go through the app.
CREATE POLICY "team_members_tenant_isolation" ON "team_members"
  FOR SELECT
  USING (team_id IN (SELECT public.get_my_team_ids()));
--> statement-breakpoint

-- activity_logs: readable, scoped to the caller's team(s); written by the app.
CREATE POLICY "activity_logs_tenant_isolation" ON "activity_logs"
  FOR SELECT
  USING (team_id IN (SELECT public.get_my_team_ids()));
--> statement-breakpoint

-- invitations: readable, scoped to the caller's team(s); written by the app.
CREATE POLICY "invitations_tenant_isolation" ON "invitations"
  FOR SELECT
  USING (team_id IN (SELECT public.get_my_team_ids()));
