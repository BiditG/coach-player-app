#!/bin/bash
# RLS + identity trigger + cascade integration test — run against a
# Supabase instance (local via `supabase start`, or staging). Validates that
# multi-tenant isolation holds at RUNTIME, which a unit test cannot
# prove (see tests/unit/security/ for the static layer, ADR 001 for the
# design). Recommended before any real deployment.
#
# Connection: export POSTGRES_URL, OR the standard psql variables
# (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE). On a local Supabase:
#   export POSTGRES_URL="$(supabase status -o env | grep DB_URL | cut -d= -f2-)"
# Prerequisite: migrations applied (drizzle-kit migrate / supabase db reset).
#
# Usage: bash scripts/test-rls-integration.sh   (or: npm run test:rls)
set -uo pipefail

PSQL() { psql ${POSTGRES_URL:+"$POSTGRES_URL"} -tAq -v ON_ERROR_STOP=0 "$@"; }
PASS=0; FAIL=0
ok() { echo "  PASS $1"; PASS=$((PASS+1)); }
ko() { echo "  FAIL $1"; FAIL=$((FAIL+1)); }
# SET both claim formats (auth.uid() varies by Supabase version:
# flat `request.jwt.claim.sub` on older images, `request.jwt.claims`
# JSON on newer ones) — setting both covers both cases.
as_user() { echo "SET ROLE authenticated; SET request.jwt.claim.sub TO '$1'; SET request.jwt.claims TO '{\"sub\":\"$1\"}';"; }

# check connection + expected schema
if ! PSQL -c "SELECT to_regclass('public.users'), to_regclass('public.teams');" | grep -q users; then
  echo "ERROR: unable to read public.users/teams. Connection? Migrations applied?"
  exit 2
fi
# idempotent GRANTs (already present on a real Supabase, useful on a bare DB)
PSQL -c "GRANT USAGE ON SCHEMA public TO anon, authenticated;
         GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
         GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
         GRANT EXECUTE ON FUNCTION public.get_my_team_ids() TO authenticated;" >/dev/null 2>&1

echo "=== reset fixtures ==="
PSQL -c "DELETE FROM auth.users WHERE email LIKE '%@rlstest.local'; TRUNCATE public.teams RESTART IDENTITY CASCADE;" >/dev/null 2>&1

echo "=== T1 identity trigger: signup creates the public.users row ==="
U1=$(PSQL -c "INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES (gen_random_uuid(),'alice@rlstest.local','{\"name\":\"Alice\"}'::jsonb) RETURNING id;")
[ "$(PSQL -c "SELECT count(*) FROM public.users WHERE id='$U1';")" = "1" ] && ok "signup -> 1 row public.users" || ko "trigger did not create the row"

echo "=== T2 anti-DoS: name > 100 chars truncated ==="
LONG=$(printf 'x%.0s' {1..200})
U2=$(PSQL -c "INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES (gen_random_uuid(),'bob@rlstest.local','{\"name\":\"$LONG\"}'::jsonb) RETURNING id;")
[ "$(PSQL -c "SELECT length(name) FROM public.users WHERE id='$U2';")" = "100" ] && ok "name truncated to 100" || ko "name not truncated (DoS)"

echo "=== T3 multi-tenant RLS isolation ==="
TA=$(PSQL -c "INSERT INTO teams (name) VALUES ('TeamA') RETURNING id;")
TB=$(PSQL -c "INSERT INTO teams (name) VALUES ('TeamB') RETURNING id;")
PSQL -c "INSERT INTO team_members (user_id,team_id,role) VALUES ('$U1',$TA,'owner'),('$U2',$TB,'owner');" >/dev/null 2>&1
[ "$(PSQL -c "$(as_user "$U1") SELECT count(*) FROM teams;")" = "1" ] && ok "alice sees ONLY her team" || ko "alice sees too many teams (leak)"
[ "$(PSQL -c "$(as_user "$U1") SELECT count(*) FROM teams WHERE id=$TB;")" = "0" ] && ok "alice cannot see bob's team" || ko "BREACH cross-tenant"

echo "=== T4 anon sees nothing ==="
[ "$(PSQL -c "SET ROLE anon; SELECT count(*) FROM users;")" = "0" ] && ok "anon sees 0 user" || ko "public LEAK (anon)"

echo "=== T5 cross-tenant self-injection refused (WITH CHECK) ==="
PSQL -c "$(as_user "$U1") INSERT INTO team_members (user_id,team_id,role) VALUES ('$U1',$TB,'owner');" >/dev/null 2>&1
[ "$(PSQL -c "SELECT count(*) FROM team_members WHERE user_id='$U1' AND team_id=$TB;")" = "0" ] && ok "injection refused" || ko "BREACH privilege escalation (injection)"

echo "=== T6 cascade delete auth -> public -> members ==="
PSQL -c "DELETE FROM auth.users WHERE id='$U1';" >/dev/null 2>&1
[ "$(PSQL -c "SELECT count(*) FROM public.users WHERE id='$U1';")" = "0" ] && ok "public.users cascade" || ko "orphan public.users"
[ "$(PSQL -c "SELECT count(*) FROM team_members WHERE user_id='$U1';")" = "0" ] && ok "team_members cascade" || ko "orphan team_members"

echo "=== cleanup fixtures ==="
PSQL -c "DELETE FROM auth.users WHERE email LIKE '%@rlstest.local'; TRUNCATE public.teams RESTART IDENTITY CASCADE;" >/dev/null 2>&1

echo "--------------------------------------"
echo "  RESULT: $PASS passed, $FAIL failed"
echo "--------------------------------------"
[ "$FAIL" -eq 0 ]
