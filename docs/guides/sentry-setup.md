# Sentry Error Tracking Setup

## 1. Install

```bash
npx @sentry/wizard@latest -i nextjs
```

This creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `app/global-error.tsx`

## 2. Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

## 3. Conditional Loading

Sentry only activates if `NEXT_PUBLIC_SENTRY_DSN` is set. No DSN = no overhead.

## 4. Source Maps

The wizard configures `withSentryConfig` in `next.config.js` to upload source maps during build.

## 5. Test

```bash
# Trigger a test error
curl http://localhost:3000/api/sentry-example-api
```

Check your Sentry dashboard for the error.

## Resources

- https://docs.sentry.io/platforms/javascript/guides/nextjs/
- https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
