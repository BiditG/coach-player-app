// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY (MEDIUM / hardening) — handle_new_user SECURITY DEFINER trigger.
//
// The original version of this test read lib/db/migrations/0001_supabase_auth_identity.sql,
// which no longer exists in the repository (migrations now live in supabase/migrations/,
// and the auth-identity migration is not among them). Rather than delete the security
// intent, this test now discovers every definition of `handle_new_user` across the
// migrations that ARE in the repo and asserts the hardening on each one. If the trigger
// is ever re-added to a migration, these checks apply to it automatically.
//
// Two residual concerns beyond the common `SET search_path = public`:
//
//   1) search_path hardening. Best practice for SECURITY DEFINER is an EMPTY
//      search_path (`SET search_path = ''` / `= pg_catalog`) with every object
//      fully schema-qualified, so a caller who can create objects in a searched
//      schema cannot shadow a function/operator the body resolves.
//
//   2) Attacker-controlled `raw_user_meta_data ->> 'name'` is inserted into
//      public.users.name (varchar(100)). A name longer than 100 chars makes the
//      INSERT throw INSIDE the AFTER-INSERT trigger, aborting the whole auth.users
//      transaction → signup denial-of-service. The trigger should bound the value.
//
// NOTE: classic SQL injection via raw_user_meta_data is NOT reachable via
// concatenation — the value is passed as a bound parameter in the plpgsql INSERT.
// We assert that stays true (no string-built dynamic SQL in the function).
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');

function migrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => path.join(MIGRATIONS_DIR, name));
}

/** Every `handle_new_user` function body found across the repo's migrations. */
function handleNewUserBodies(): Array<{ file: string; body: string }> {
  const found: Array<{ file: string; body: string }> = [];

  for (const file of migrationFiles()) {
    const sql = fs.readFileSync(file, 'utf-8');
    const marker = 'CREATE OR REPLACE FUNCTION public.handle_new_user';

    let cursor = sql.indexOf(marker);
    while (cursor !== -1) {
      const end = sql.indexOf('$$;', cursor);
      found.push({ file: path.basename(file), body: sql.slice(cursor, end === -1 ? undefined : end + 3) });
      cursor = end === -1 ? -1 : sql.indexOf(marker, end + 3);
    }
  }

  return found;
}

const definitions = handleNewUserBodies();

describe('SECURITY: handle_new_user SECURITY DEFINER hardening', () => {
  it('has migrations to inspect', () => {
    // Guards the guard: if this ever reads 0 files the assertions below would
    // silently pass without checking anything.
    expect(migrationFiles().length).toBeGreaterThan(0);
  });

  it.each(definitions.map((d) => [d.file, d.body] as const))(
    '%s pins an empty/locked search_path (not a mutable one)',
    (_file, fn) => {
      const emptyOrCatalog =
        /set\s+search_path\s*=\s*''/i.test(fn) || /set\s+search_path\s*=\s*pg_catalog/i.test(fn);

      expect(
        emptyOrCatalog,
        'SECURITY DEFINER function uses a mutable `SET search_path = public`. ' +
          "Harden to `SET search_path = ''` with fully-qualified object names."
      ).toBe(true);
    }
  );

  it.each(definitions.map((d) => [d.file, d.body] as const))(
    '%s bounds the attacker-controlled name to the column length (no signup DoS)',
    (_file, fn) => {
      // Split into two bounded checks instead of one alternation with two
      // unbounded `[^,]*` around a fixed literal (flagged by sonarjs as
      // super-linear / overly complex) — same detection intent, no backtracking.
      const leftCallArgs = fn.match(/left\s*\(([^)]*)\)/i)?.[1] ?? '';
      const truncatesNameTo100 =
        /->>\s*'name'/i.test(leftCallArgs) && /,\s*100\s*$/.test(leftCallArgs.trim());
      const usesSubstring = /substr(ing)?\s*\(/i.test(fn);
      const guards = truncatesNameTo100 || usesSubstring;

      expect(
        guards,
        'name is inserted raw from NEW.raw_user_meta_data into varchar(100); a >100 ' +
          "char name aborts the signup transaction. Truncate, e.g. left(NEW.raw_user_meta_data ->> 'name', 100)."
      ).toBe(true);
    }
  );

  it.each(definitions.map((d) => [d.file, d.body] as const))(
    '%s never builds dynamic SQL from the metadata (keeps the insert parameterized)',
    (_file, fn) => {
      // Regression guard: no EXECUTE / format() / '||' string-built SQL in the body.
      const dynamic = /\bexecute\b|\bformat\s*\(|->>\s*'name'\s*\|\|/i.test(fn);

      expect(
        dynamic,
        'handle_new_user must keep the INSERT parameterized (no EXECUTE/format/|| on ' +
          'raw_user_meta_data) so metadata can never become executable SQL.'
      ).toBe(false);
    }
  );
});
