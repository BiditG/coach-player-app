# PostHog Analytics Setup

PostHog provides analytics, session recordings, and feature flags.

## 1. Install

```bash
npm install posthog-js posthog-node
```

## 2. Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

For self-hosted: set `NEXT_PUBLIC_POSTHOG_HOST` to your instance URL.

## 3. Create Provider

Create `app/providers.tsx`:
```typescript
'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
                capture_pageview: true,
            });
        }
    }, []);

    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>;
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

## 4. Wrap Layout

In `app/layout.tsx`:
```typescript
import { PHProvider } from './providers';

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                <PHProvider>{children}</PHProvider>
            </body>
        </html>
    );
}
```

## 5. Feature Flags (bonus)

```typescript
import { useFeatureFlagEnabled } from 'posthog-js/react';

function MyComponent() {
    const showNewUI = useFeatureFlagEnabled('new-ui');
    return showNewUI ? <NewUI /> : <OldUI />;
}
```

## 6. Server-Side Events

```typescript
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

posthog.capture({ distinctId: userId, event: 'subscription_created' });
```

## Resources

- https://posthog.com/docs/libraries/next-js
- https://posthog.com/tutorials/nextjs-analytics
