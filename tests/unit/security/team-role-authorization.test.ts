// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY (HIGH) — Vertical privilege escalation inside a tenant.
//
// `removeTeamMember` and `inviteTeamMember` in app/(login)/actions.ts authenticate
// the caller and scope the write to the caller's OWN team (good — no cross-tenant
// leak), but they never check that the caller's role is `owner`. Consequences:
//
//   • Any plain `member` can DELETE any other member of their team — including the
//     owner — locking the real owner out of their own tenant (team takeover).
//   • Any plain `member` can INVITE new members, and the invite schema accepts
//     role: 'owner' (actions.ts inviteTeamMemberSchema), so a member can mint a
//     colluding owner account. Straight privilege escalation.
//
// `withTeam` (lib/auth/middleware.ts) is ALSO only a membership gate, not a role
// gate — so wrapping an action in withTeam does not fix this either.
//
// These assertions require the mutating team actions to gate on owner role. They
// are RED today (no role check exists) and turn GREEN once authorization is added.
// ─────────────────────────────────────────────────────────────────────────────

const ACTIONS = path.resolve(__dirname, '../../../app/(login)/actions.ts');

function extractFn(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  expect(start, `function ${name} not found in actions.ts`).toBeGreaterThan(-1);
  // Grab a generous window; the function bodies here are < 80 lines each.
  return source.slice(start, start + 3000);
}

// Heuristic: the body must compare a role value against 'owner' (or reject
// non-owners) before it mutates. We look for a literal 'owner'/"owner" used in a
// guard, not merely in an enum of allowed invite roles.
// Split into independent, bounded patterns instead of one alternation with an
// unbounded `.*role` branch (flagged by sonarjs as super-linear / overly
// complex) and a redundant trailing branch — same detection intent.
const OWNER_GUARD_PATTERNS = [
  /role\s*[!=]==?\s*['"]owner['"]/, // role !== 'owner' / role === 'owner'
  /['"]owner['"]\s*[!=]==?\s*role/, // 'owner' !== role (reversed order)
  /\bisOwner\b/,
  /\brequireOwner\b/,
];

function hasOwnerAuthorizationGuard(body: string): boolean {
  return OWNER_GUARD_PATTERNS.some((pattern) => pattern.test(body));
}

describe('SECURITY: owner-role authorization on mutating team actions', () => {
  const source = fs.readFileSync(ACTIONS, 'utf-8');

  it('removeTeamMember refuses non-owner callers', () => {
    const body = extractFn(source, 'removeTeamMember');
    expect(
      hasOwnerAuthorizationGuard(body),
      'removeTeamMember has no owner-role check: any team member can remove any ' +
        'other member (including the owner). Add a guard that returns an error ' +
        "unless the caller's role === 'owner' before the db.delete(teamMembers)."
    ).toBe(true);
  });

  it('inviteTeamMember refuses non-owner callers', () => {
    const body = extractFn(source, 'inviteTeamMember');
    expect(
      hasOwnerAuthorizationGuard(body),
      'inviteTeamMember has no owner-role check: any team member can invite new ' +
        "members and the schema accepts role: 'owner', so a member can escalate " +
        'to owner. Gate the action on the caller being an owner.'
    ).toBe(true);
  });

  it('withTeam middleware does not silently substitute for a role check', () => {
    // Documents the trap: withTeam only proves membership. If a future action is
    // wrapped in withTeam and assumed "safe", it is still member-accessible.
    const mw = fs.readFileSync(
      path.resolve(__dirname, '../../../lib/auth/middleware.ts'),
      'utf-8'
    );
    const claimsRoleCheck = /role|owner/.test(mw);
    // We assert the CURRENT reality (no role logic) so that if someone adds role
    // handling to withTeam they must revisit this test and the callers together.
    expect(
      claimsRoleCheck,
      'withTeam gained role/owner logic — re-audit every withTeam caller to ' +
        'confirm the role requirement matches the action.'
    ).toBe(false);
  });
});
