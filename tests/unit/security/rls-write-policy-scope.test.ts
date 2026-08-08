// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY (HIGH) — Intra-tenant privilege escalation & billing bypass via the
// PostgREST / anon-key write vector.
//
// 0002_rls_policies.sql correctly ENABLEs RLS and scopes every row to the
// caller's team (no CROSS-tenant leak — that part is sound). But the write
// policies on team_members / teams / invitations / activity_logs are declared
// `FOR ALL` with only a *membership* predicate:
//
//     USING      (team_id IN (SELECT public.get_my_team_ids()))
//     WITH CHECK (team_id IN (SELECT public.get_my_team_ids()))
//
// `FOR ALL` = SELECT + INSERT + UPDATE + DELETE, and the predicate only asks
// "are you a member of this team?", never "are you an OWNER?". Because Supabase
// grants ALL on public tables to `authenticated` and auto-exposes them over
// PostgREST (https://<project>.supabase.co/rest/v1/<table>) with the PUBLIC
// NEXT_PUBLIC_SUPABASE_ANON_KEY + the caller's JWT, any authenticated *member*
// of a team can, WITHOUT going through a single server action:
//
//   • Self-promote to owner:
//       PATCH /rest/v1/team_members?id=eq.<self>   {"role":"owner"}
//     or  POST /rest/v1/team_members  {"team_id":<mine>,"user_id":<self>,"role":"owner"}
//     → getTeamMemberRole() now returns 'owner', unlocking removeTeamMember /
//       inviteTeamMember (the app's carefully-written owner gate is bypassed).
//   • Remove the legitimate owner: DELETE /rest/v1/team_members?id=eq.<owner>
//     → team takeover.
//   • Free plan upgrade: PATCH /rest/v1/teams?id=eq.<mine>
//       {"subscription_status":"active","plan_name":"Plus"}
//     → paid features unlocked without paying.
//   • Forge audit history / invitations with role:'owner'.
//
// The application NEVER writes these tables through the anon/authenticated
// PostgREST path — it uses the direct POSTGRES_URL connection (lib/db/drizzle.ts)
// which bypasses RLS. So the correct fix is to NOT expose writes over PostgREST:
// make these policies `FOR SELECT` (read-only, so client-side supabase-js reads
// still work), or gate any write policy on the owner role. Either removes the
// escalation.
//
// This test asserts that invariant. It is RED against the current `FOR ALL`
// policies and turns GREEN once writes are made SELECT-only or owner-gated.
// ─────────────────────────────────────────────────────────────────────────────

const RLS_SQL = path.resolve(
  __dirname,
  '../../../lib/db/migrations/0002_rls_policies.sql'
);

// Tables whose writes, if reachable over the anon/authenticated PostgREST API,
// let a plain member escalate privilege or tamper with billing/audit state.
const WRITE_SENSITIVE_TABLES = [
  'team_members',
  'teams',
  'invitations',
  'activity_logs',
] as const;

type PolicyBlock = { command: string; body: string };

// Extract each `CREATE POLICY ... ON "<table>" ... ;` block for a given table.
function policiesFor(sql: string, table: string): PolicyBlock[] {
  const blocks: PolicyBlock[] = [];
  const re = new RegExp(
    `create\\s+policy\\s+"[^"]+"\\s+on\\s+"?(?:public\\.)?${table}"?([\\s\\S]*?);`,
    'gi'
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const body = m[1];
    const cmd =
      /\bfor\s+(all|select|insert|update|delete)\b/i.exec(body)?.[1] ?? 'all';
    blocks.push({ command: cmd.toLowerCase(), body });
  }
  return blocks;
}

const WRITE_COMMANDS = new Set(['all', 'insert', 'update', 'delete']);

// A write policy is safe only if its predicate constrains the caller to the
// owner role (e.g. references 'owner', or an owner-only helper). A bare
// membership predicate is NOT enough.
function isOwnerGated(body: string): boolean {
  return /owner/i.test(body);
}

describe('SECURITY: RLS write policies must not grant member-level writes over PostgREST', () => {
  const sql = fs.readFileSync(RLS_SQL, 'utf-8');

  for (const table of WRITE_SENSITIVE_TABLES) {
    it(`${table}: no member-scoped write policy (must be SELECT-only or owner-gated)`, () => {
      const blocks = policiesFor(sql, table);
      expect(
        blocks.length,
        `No policy found for ${table} — parser or migration drift.`
      ).toBeGreaterThan(0);

      const unsafeWrites = blocks.filter(
        (b) => WRITE_COMMANDS.has(b.command) && !isOwnerGated(b.body)
      );

      expect(
        unsafeWrites.map((b) => `FOR ${b.command.toUpperCase()}`),
        `${table} exposes writes (${unsafeWrites
          .map((b) => b.command.toUpperCase())
          .join(
            ', '
          )}) over the anon/authenticated PostgREST API scoped only by team ` +
          `membership. Any plain member can escalate to owner / tamper with ` +
          `billing/audit via a direct REST call using the public anon key. Make ` +
          `these policies FOR SELECT (the app writes via the direct POSTGRES_URL ` +
          `connection, which bypasses RLS) or gate the write on the owner role.`
      ).toHaveLength(0);
    });
  }

  it('team_members write path specifically cannot be used for self-promotion to owner', () => {
    const blocks = policiesFor(sql, 'team_members');
    const writeBlocks = blocks.filter((b) => WRITE_COMMANDS.has(b.command));
    // Either there is no PostgREST-reachable write policy at all, or every one
    // is owner-gated. A `FOR ALL` membership-only policy fails both.
    const memberScopedWrite = writeBlocks.some((b) => !isOwnerGated(b.body));
    expect(
      memberScopedWrite,
      'team_members has a member-scoped write policy: a member can INSERT/UPDATE ' +
        "their own row to role='owner' via PostgREST, then the app trusts " +
        'getTeamMemberRole() === owner. This defeats the owner authorization ' +
        'model enforced in app/(login)/actions.ts.'
    ).toBe(false);
  });
});
