# Incident Runbook

## Severity Levels

| Level | Definition | Response Time | Example |
|---|---|---|---|
| **S1 - Critical** | Service down, data loss risk | 15 min | App inaccessible, DB corruption |
| **S2 - Major** | Core feature broken | 1 hour | Payments failing, auth broken |
| **S3 - Minor** | Non-core feature broken | 4 hours | UI glitch, slow page |
| **S4 - Low** | Cosmetic or edge case | Next business day | Typo, minor styling |

## When Something Breaks

### 1. Assess

- Check `/api/health` endpoint
- Check Vercel deployment status (or hosting provider dashboard)
- Check Supabase dashboard for DB status
- Check Stripe dashboard for payment status

### 2. Communicate

- Note the time of first detection
- Identify affected users/features

### 3. Mitigate

**App down:**
- Check Vercel Functions logs
- Redeploy last known good commit: `vercel --prod` or push revert to main
- Check environment variables are set correctly

**DB issues:**
- Check Supabase dashboard → Database → Logs
- Verify connection string in env vars
- Check if migrations are pending: `npm run db:migrate`

**Auth broken:**
- Check Supabase Auth logs
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check RLS policies

**Payments broken:**
- Check Stripe dashboard → Events
- Verify webhook endpoint is receiving events
- Check `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

### 4. Resolve & Document

- Fix the root cause
- Write a post-mortem using `POST-MORTEM-TEMPLATE.md`
- Create follow-up tasks for preventive measures
