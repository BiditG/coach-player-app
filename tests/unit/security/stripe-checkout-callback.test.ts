// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY (MEDIUM) — Unauthenticated, unverified Stripe checkout callback.
//
// app/api/stripe/checkout/route.ts (GET) is the post-checkout redirect target.
// It takes `session_id` from the query string, retrieves the Stripe session, and
// writes stripeCustomerId / stripeSubscriptionId / planName / subscriptionStatus
// onto the team of whoever `session.client_reference_id` points at. Problems:
//
//   1. NO auth check — it never calls getUser(). Anyone who can present a valid
//      `session_id` triggers the DB write; there is no confirmation that the
//      logged-in caller is the payer (client_reference_id).
//   2. NO payment verification — it never checks session.payment_status === 'paid'
//      (or session.status === 'complete'), so a session in an incomplete/unpaid
//      state can still flip a team's subscriptionStatus.
//   3. NO idempotency — replayable.
//
// Hardening: require an authenticated caller, assert the caller's id matches
// session.client_reference_id, and gate the write on a paid/complete session.
// This test asserts (1) and (2); it is RED today and GREEN once the route checks
// authentication AND payment_status/session status before writing.
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE = path.resolve(
  __dirname,
  '../../../app/api/stripe/checkout/route.ts'
);

describe('SECURITY: Stripe checkout callback must authenticate and verify payment', () => {
  const source = fs.readFileSync(ROUTE, 'utf-8');

  it('verifies the session was actually paid/completed before writing subscription state', () => {
    const checksPayment =
      /payment_status/.test(source) ||
      /session\.status\s*[!=]==?\s*['"]complete['"]/.test(source);
    expect(
      checksPayment,
      'checkout/route.ts writes subscription state without checking ' +
        "session.payment_status === 'paid' (or session.status === 'complete'). " +
        'An unpaid/incomplete session can flip a team subscription. Verify the ' +
        'session is paid before the db.update(teams).'
    ).toBe(true);
  });

  it('authenticates the caller and ties the write to the authenticated user', () => {
    // The route must prove the caller is the payer, not merely trust the
    // client_reference_id embedded in an arbitrary session_id.
    const authenticatesCaller = /getUser\s*\(/.test(source);
    expect(
      authenticatesCaller,
      'checkout/route.ts never calls getUser(): it trusts session.client_reference_id ' +
        'from an unauthenticated GET. Require an authenticated caller and assert ' +
        'user.id === session.client_reference_id before writing.'
    ).toBe(true);
  });
});
