// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY (MEDIUM / hardening) — handle_new_user SECURITY DEFINER trigger.
//
// lib/db/migrations/0001_supabase_auth_identity.sql defines a SECURITY DEFINER
// function that runs with the owner's (elevated) privileges on every auth.users
// insert. Two residual concerns beyond the current `SET search_path = public`:
//
//   1) search_path hardening. Best practice for SECURITY DEFINER is an EMPTY
//      search_path (`SET search_path = ''` / `= pg_catalog`) with every object
//      fully schema-qualified, so a caller who can create objects in a searched
//      schema cannot shadow a function/operator the body resolves. The body here
//      IS qualified (public.users), but `search_path = public` still leaves
//      operator/function resolution partially caller-influenced. This test asks
//      for the stricter, standard hardening.
//
//   2) Attacker-controlled `raw_user_meta_data ->> 'name'` is inserted into
//      public.users.name (varchar(100)). `name` is fully controlled at signup
//      via supabase.auth.signUp({ options: { data: { name } } }). A name longer
//      than 100 chars makes the INSERT throw INSIDE the AFTER-INSERT trigger,
//      aborting the whole auth.users transaction → signup denial-of-service.
//      The trigger should defend the column bound (truncate / left(...,100)).
//
// NOTE: classic SQL injection via raw_user_meta_data is NOT reachable here — the
// value is passed as a bound parameter in the plpgsql INSERT, not concatenated.
// We assert that stays true (no string-built dynamic SQL in the function).
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATION = path.resolve(
  __dirname,
  '../../../lib/db/migrations/0001_supabase_auth_identity.sql'
);

function handleNewUserBody(sql: string): string {
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.handle_new_user');
  expect(start, 'handle_new_user function not found').toBeGreaterThan(-1);
  const end = sql.indexOf('$$;', start);
  return sql.slice(start, end + 3);
}

describe('SECURITY: handle_new_user SECURITY DEFINER hardening', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf-8');
  const fn = handleNewUserBody(sql);

  it('pins an empty/locked search_path (not a mutable one)', () => {
    const emptyOrCatalog =
      /set\s+search_path\s*=\s*''/i.test(fn) ||
      /set\s+search_path\s*=\s*pg_catalog/i.test(fn);
    expect(
      emptyOrCatalog,
      "SECURITY DEFINER function uses `SET search_path = public` (mutable). " +
        "Harden to `SET search_path = ''` with fully-qualified object names."
    ).toBe(true);
  });

  it('bounds the attacker-controlled name to the column length (no signup DoS)', () => {
    const guards = /left\s*\(\s*[^,]*->>\s*'name'[^,]*,\s*100\s*\)|substr(ing)?\s*\(/i.test(
      fn
    );
    expect(
      guards,
      'name is inserted raw from NEW.raw_user_meta_data into varchar(100); a >100 ' +
        'char name aborts the signup transaction. Truncate, e.g. left(NEW.raw_user_meta_data ->> \'name\', 100).'
    ).toBe(true);
  });

  it('never builds dynamic SQL from the metadata (keeps the insert parameterized)', () => {
    // Regression guard: no EXECUTE / format()/ '||' string-built SQL in the body.
    const dynamic = /\bexecute\b|\bformat\s*\(|->>\s*'name'\s*\|\|/i.test(fn);
    expect(
      dynamic,
      'handle_new_user must keep the INSERT parameterized (no EXECUTE/format/|| on ' +
        'raw_user_meta_data) so metadata can never become executable SQL.'
    ).toBe(false);
  });
});
