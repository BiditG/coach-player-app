# Next.js SaaS Starter (Supabase + Drizzle + Stripe)

A production-minded starter for building a multi-tenant SaaS with **Next.js**,
**Supabase Auth**, **Drizzle ORM** on Postgres, and **Stripe** subscriptions.
Teams, role-based access, row-level security, and a quality/test harness are
wired in from the start.

> This is a fork of [`nextjs/saas-starter`](https://github.com/nextjs/saas-starter)
> (MIT), rebuilt around Supabase Auth + RLS with a stronger test/quality setup.
> It is a **learning-oriented** base — intentionally minimal, meant to be read
> and extended.

## Features

- Marketing landing page (`/`) and pricing page (`/pricing`) wired to Stripe Checkout
- Dashboard with CRUD on users/teams
- **Supabase Auth** (the `public.users` row is bridged from `auth.users` via a
  `SECURITY DEFINER` trigger — see `docs/adr/001-…`)
- Teams + RBAC (owner / member)
- Subscription management via the Stripe Customer Portal
- **Row-Level Security** multi-tenant isolation, with static **and** runtime tests
- Global + local middleware to protect routes and validate Zod schemas
- Activity logging
- Quality harness: type checks, ESLint (+sonarjs), duplication (jscpd), dead-code
  (knip), unit/integration (Vitest), E2E (Playwright), architecture fitness tests

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Auth**: [Supabase Auth](https://supabase.com/auth)
- **Database**: Postgres (Supabase, Neon, or any provider)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI**: [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS

## Getting Started

```bash
git clone <your-fork-url> saas-starter
cd saas-starter
npm install
```

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com/), then copy your keys
into a local `.env` (start from the template):

```bash
cp .env.example .env
```

Fill in at least:

- `POSTGRES_URL` — your database connection string
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from the Supabase API settings
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only, **never** exposed to the browser
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `BASE_URL` — `http://localhost:3000` in dev

### 2. Run migrations

```bash
npm run db:migrate
npm run db:seed   # optional: creates a demo user/team
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Stripe webhooks (optional, local)

Install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Testing Payments

Use Stripe's test card:

- Card: `4242 4242 4242 4242`
- Expiry: any future date · CVC: any 3 digits

## Quality & Tests

```bash
npm run typecheck      # tsc --noEmit
npm run test:run       # unit + integration (Vitest)
npm run test:rls       # runtime RLS isolation checks (needs a DB)
npm run test:arch      # architecture fitness tests
npm run test:e2e       # Playwright E2E
npm run quality:scan   # jscpd + knip + eslint
```

## Going to Production

1. Create a **production Stripe webhook** pointing at
   `https://yourdomain.com/api/stripe/webhook`.
2. Push to GitHub and import the repo in [Vercel](https://vercel.com/).
3. Set the production env vars (`POSTGRES_URL`, the Supabase keys, the Stripe
   keys, and `BASE_URL` = your production domain).

`vercel-build` runs `drizzle-kit migrate` before `next build`, so migrations are
applied on deploy. A local `npm run build` needs a `.env` (run `cp .env.example .env`
first) but does **not** require a live/reachable database — build-time only checks
that the variables are set.

## Security model

This app uses **two data paths**, and the distinction is load-bearing for security:

1. **The app itself** reads/writes via a direct Postgres connection
   (`POSTGRES_URL`, `lib/db/drizzle.ts`) which **bypasses Row-Level Security**.
   All authorization for writes lives in the server actions
   (`app/(login)/actions.ts` — e.g. the owner-role gate on team mutations).
2. **The Supabase client** (anon / `authenticated` key) can reach the tables via
   Supabase's auto-exposed PostgREST API. **RLS is the only thing protecting this
   path**, so the client-facing policies are **`SELECT`-only**
   (`lib/db/migrations/0002_rls_policies.sql`).

> ⚠️ **Do not widen these policies to `FOR ALL`.** If you do, any authenticated
> member can `PATCH` their own row to `role = 'owner'`, remove the real owner, or
> flip their team's `subscription_status` to `active` — all via the public anon
> key, bypassing every server-action check. If you need client-side writes,
> add role-scoped `WITH CHECK` policies rather than a blanket `FOR ALL`.

## Known limitations

- **RLS is verified statically, not at runtime.** `test:rls` and the security
  unit tests assert the policy *shape*; they do not spin up a real Supabase
  instance with two tenants. Run the runtime isolation check against a live
  database before relying on this in production.
- **The Stripe checkout success callback** (`/api/stripe/checkout`) updates
  subscription state on an authenticated GET; treat it as defence-in-depth only —
  the **signed webhook** (`/api/stripe/webhook`) is the source of truth.
- **Application-code test coverage is ~0%.** The suite is intentionally
  fitness/security-oriented (it reads source & SQL statically) and does not
  execute `app/**`/`lib/**`. The coverage threshold is set to 0 to reflect this
  honestly — raise it as you add behavioural tests.

## License

MIT. Forked from [`nextjs/saas-starter`](https://github.com/nextjs/saas-starter)
(© Vercel) — see `LICENSE`.
