// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY (regression) — the middleware's auth-exemption for the Stripe webhook
// must target the REAL route path. Stripe POSTs to /api/stripe/webhook with no
// user cookie; if the middleware exempts a stale '/webhook' prefix instead, two
// things break:
//   • the webhook is redirected 307 -> /login in prod (silent subscription
//     failures), and
//   • '/webhook' becomes a latent auth bypass for a non-existent path (mounting
//     anything there later would be unauthenticated by accident).
// ─────────────────────────────────────────────────────────────────────────────

const MW = path.resolve(__dirname, '../../../lib/supabase/middleware.ts');
const source = fs.readFileSync(MW, 'utf-8');

describe('SECURITY: middleware webhook exemption path', () => {
  it('exempts the real webhook route', () => {
    expect(source).toContain("startsWith('/api/stripe/webhook')");
  });

  it('does not exempt a stale bare /webhook prefix', () => {
    // Must not match `startsWith('/webhook')` (would be a latent auth bypass).
    const bareWebhook = /startsWith\(\s*['"]\/webhook['"]\s*\)/;
    expect(bareWebhook.test(source), 'stale /webhook exemption present').toBe(
      false
    );
  });
});
