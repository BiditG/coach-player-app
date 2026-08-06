-- Rewire `public.users` onto Supabase Auth identity (auth.users.id) and wire
-- up the DB trigger that keeps them in sync.
--
-- IMPORTANT — this migration assumes a fresh, empty database (the normal
-- case for a new Supabase starter install, before any
-- signup has happened). Postgres has no cast path from integer to uuid
-- (not even an explicit one), so the naive `ALTER COLUMN ... SET DATA TYPE
-- uuid` that a raw schema diff would produce cannot actually run — we
-- DROP + re-ADD the affected columns as uuid instead. If you are applying
-- this to a database that already has real rows, back them up and re-seed
-- through Supabase Auth instead of running this migration as-is.
--
-- NOTE: "auth"."users" is Supabase's own table (managed by Supabase Auth,
-- not by this project's migrations). It already exists in every Supabase
-- project — we only ever reference it via foreign key here, never CREATE
-- or DROP it.

-- 1. Drop the FKs that point at users.id before changing its type.
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_invited_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_user_id_users_id_fk";
--> statement-breakpoint

-- 2. Rebuild users.id as the Supabase Auth user id. No default value: rows
-- are created exclusively by the handle_new_user trigger below, never by
-- application code (see design note in lib/db/schema.ts).
ALTER TABLE "users" DROP COLUMN "id";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "id" uuid PRIMARY KEY;
--> statement-breakpoint

-- 3. Rebuild the child integer columns as uuid.
ALTER TABLE "activity_logs" DROP COLUMN "user_id";
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "invitations" DROP COLUMN "invited_by";
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "invited_by" uuid;
--> statement-breakpoint
ALTER TABLE "team_members" DROP COLUMN "user_id";
--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "user_id" uuid NOT NULL;
--> statement-breakpoint

-- 4. Re-add the foreign keys, including the new cross-schema FK to
-- Supabase's auth.users. Constraint names match what `drizzle-kit generate`
-- derives from schema.ts, so future diffs stay no-ops on these.
ALTER TABLE "users" ADD CONSTRAINT "users_id_users_id_fk"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk"
  FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 5. Identity bridge: insert the `public.users` row when a Supabase Auth
-- user is created. SECURITY DEFINER + a pinned search_path so the function
-- can INSERT into public.users regardless of the caller's privileges
-- (GoTrue/the signup flow only has access to the `auth` schema) while not
-- being hijackable via a mutated search_path. `search_path = ''` (rather
-- than `= public`) is the stricter, standard SECURITY DEFINER hardening:
-- with an empty search_path, object/operator resolution cannot be
-- influenced by anything a caller might create in a searched schema, since
-- every object the body touches is fully schema-qualified (public.users)
-- already. ON CONFLICT DO NOTHING makes it safe to re-run/retry without
-- producing duplicate rows; it is not relied upon for the "exactly once"
-- guarantee, which comes from auth.users.id being a primary key.
-- `left(..., 100)` bounds the attacker-controlled `name` metadata (fully
-- settable by the caller via supabase.auth.signUp({ options: { data } })) to
-- the column width, so an over-long name cannot abort this AFTER INSERT
-- trigger and deny the signup transaction (DoS).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, left(NEW.raw_user_meta_data ->> 'name', 100))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
