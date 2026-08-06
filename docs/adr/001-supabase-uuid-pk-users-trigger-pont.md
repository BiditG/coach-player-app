# ADR 001 — Supabase identity: `users.id` UUID + `handle_new_user` trigger bridge

Date: 2026-08-02
Status: accepted
Context: this starter. Migration to Supabase Auth left incomplete (Supabase↔`users` table bridge absent, dead JWT pattern). Decision validated by technical review.

## Decision

1. **`public.users.id` is of type `uuid` and equals the Supabase user's `id` (`auth.users.id`).** No surrogate `serial` key + `authId` column. The stack is already coupled to Supabase (`lib/supabase/*`) → a multi-provider indirection would be YAGNI.
2. **The identity bridge is a DB trigger `handle_new_user` (SECURITY DEFINER) on `auth.users`.** Transactional at user creation → guarantees *exactly one* `users` row, immune to races (double OAuth callback, retries, magic link). NOT an application-level check-then-insert at callback time (racy).
3. **Network side-effects** (Stripe client, team bootstrap) remain application-level and **idempotent** (`ON CONFLICT DO NOTHING` / `stripe_id IS NULL` guard), at callback or lazy-init time — a trigger cannot call Stripe.
4. **`passwordHash` is removed** from `users` (Supabase owns the credentials). The seed creates users via `supabase.auth.admin.createUser` (the trigger produces the row).

## Invariants (DB-enforced)
- 1 Supabase user ⇒ 1 `users` row: `uuid` PK + trigger + unique `email`.
- No orphan row: cross-schema FK `users.id REFERENCES auth.users(id) ON DELETE CASCADE`.
- No orphan child: `teamMembers.userId` cascades, `activityLogs.userId` set null (audit preserved), `invitations.invitedBy` to be decided.
- `users.id` is immutable.

## Consequences
- SQL migration: PK type `serial→uuid`, children FKs `integer→uuid`, trigger, cross-schema FK, onDelete policies.
- Rewiring: `queries.ts` (getUser via `supabase.auth.getUser()`), checkout, `stripe.ts`, `seed.ts`, removal of `@/lib/auth/session` references (dead JWT).

## Rejected alternatives
- **Strategy 2 (separate `authId` column)**: indirection with no benefit here (Supabase coupling already assumed), risk of rows with null `authId`.
- **Bridge at application callback**: racy.
- **Restart from an upstream template (3rd path)**: more solid long-term but discards the dependency work already done; kept as a possible future direction, not for this cycle.
