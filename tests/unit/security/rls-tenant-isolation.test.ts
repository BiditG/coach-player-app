// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY (CRITICAL) — Cross-tenant isolation via Row Level Security.
//
// This is a Supabase project: `lib/supabase/server.ts` + `lib/supabase/middleware.ts`
// build clients with NEXT_PUBLIC_SUPABASE_ANON_KEY, which is a PUBLIC value shipped
// in the browser bundle. Supabase auto-exposes every table in the `public` schema
// through its PostgREST endpoint (https://<project>.supabase.co/rest/v1/<table>),
// and Supabase's bootstrap grants the `anon` / `authenticated` roles ALL privileges
// on public-schema tables by default. The ONLY thing standing between an anonymous
// HTTP caller and every tenant's rows is Row Level Security.
//
// If RLS is disabled (or enabled with no policy), anyone holding the public anon key
// can, without touching a single server action:
//   GET   /rest/v1/users?select=*            → dump every user's email/name
//   GET   /rest/v1/teams?select=*            → dump every team + stripe_customer_id
//   POST  /rest/v1/team_members              → insert themselves into ANY team
//   PATCH /rest/v1/users?id=eq.<victim>      → escalate role, overwrite email
//
// These assertions encode the invariant "no public table is reachable without RLS".
// They are the non-regression guard for the fix (enable RLS + per-tenant policies).
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../lib/db/migrations');

// Tenant/user data tables that MUST NOT be readable/writable cross-tenant.
const SENSITIVE_TABLES = [
  'users',
  'teams',
  'team_members',
  'activity_logs',
  'invitations',
] as const;

function latestSnapshot(): Record<string, any> {
  const metaDir = path.join(MIGRATIONS_DIR, 'meta');
  const snapshots = fs
    .readdirSync(metaDir)
    .filter((f) => f.endsWith('_snapshot.json'))
    .sort();
  const last = snapshots[snapshots.length - 1];
  return JSON.parse(fs.readFileSync(path.join(metaDir, last), 'utf-8'));
}

function allMigrationSql(): string {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8'))
    .join('\n');
}

describe('SECURITY: RLS cross-tenant isolation (Supabase public schema)', () => {
  it('every sensitive public table has RLS enabled in the drizzle snapshot', () => {
    const snapshot = latestSnapshot();
    const offenders: string[] = [];

    for (const table of SENSITIVE_TABLES) {
      const key = `public.${table}`;
      const def = snapshot.tables?.[key];
      expect(def, `table ${key} missing from snapshot`).toBeDefined();
      if (def.isRLSEnabled !== true) {
        offenders.push(key);
      }
    }

    expect(
      offenders,
      `RLS is DISABLED on: ${offenders.join(', ')}. With Supabase's default ` +
        `anon/authenticated GRANTs, these tables are fully readable AND writable ` +
        `via PostgREST using only the public NEXT_PUBLIC_SUPABASE_ANON_KEY. ` +
        `This is a full cross-tenant data breach. Enable RLS on each table.`
    ).toHaveLength(0);
  });

  it('a migration actually issues ENABLE ROW LEVEL SECURITY for each sensitive table', () => {
    const sql = allMigrationSql().toLowerCase();
    const missing = SENSITIVE_TABLES.filter(
      (t) =>
        !new RegExp(
          `alter\\s+table\\s+"?(public\\.)?${t}"?\\s+enable\\s+row\\s+level\\s+security`
        ).test(sql)
    );

    expect(
      missing,
      `No "ENABLE ROW LEVEL SECURITY" migration found for: ${missing.join(', ')}.`
    ).toHaveLength(0);
  });

  it('a migration defines at least one tenant-scoping RLS policy per sensitive table', () => {
    const sql = allMigrationSql().toLowerCase();
    // A table with RLS enabled but zero policies denies ALL access — safe, but
    // then the app cannot work, so the real fix ships policies. We assert their
    // presence so "enable RLS then forget the policy" is not mistaken for done.
    const withoutPolicy = SENSITIVE_TABLES.filter(
      (t) => !new RegExp(`create\\s+policy[^;]+on\\s+"?(public\\.)?${t}"?`).test(sql)
    );

    expect(
      withoutPolicy,
      `No CREATE POLICY found for: ${withoutPolicy.join(', ')}. ` +
        `Each table needs a policy scoping rows to the caller's team/user ` +
        `(e.g. USING team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())).`
    ).toHaveLength(0);
  });
});
