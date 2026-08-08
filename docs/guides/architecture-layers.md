# Architecture Layers Guide

## Principle

Separate shared infrastructure (utils/) from business logic (domain/) to avoid coupling.

## Recommended structure

```
project/
├── utils/                  # Shared infrastructure
│   ├── api/               # error-handler, rate-limit, auth-middleware
│   ├── db/                # Drizzle client, schema, migrations
│   ├── supabase/          # Supabase client (auth, cookies)
│   └── stripe/            # Stripe helpers
├── domain/                # Business logic (create when the project grows)
│   └── {feature}/         # One folder per feature/vertical
│       ├── actions.ts     # Server actions
│       ├── queries.ts     # Data access
│       └── types.ts       # Business types
├── components/            # UI components (React)
│   ├── ui/               # shadcn/ui primitives
│   └── {feature}/        # Components per feature
├── app/                   # Next.js routes (thin layer)
│   ├── api/              # API routes (call domain/)
│   └── (pages)/          # Pages (call domain/ or actions)
└── lib/                   # Framework-specific helpers (rare)
```

## Import rules

```
app/ ──> domain/ ──> utils/
  │         │
  └──> components/
```

| From | Can import | MUST NOT import |
|--------|--------------|---------------------|
| `app/` | domain/, utils/, components/ | — |
| `domain/` | utils/ | app/, components/ |
| `components/` | utils/supabase/ (auth only) | utils/db/, domain/ |
| `utils/` | other utils/ | app/, components/, domain/ |

## When to create domain/

- **MVP (< 10 API routes)**: not necessary, utils/ is enough
- **Growth (10-30 routes)**: extract business logic into domain/
- **Scale (30+ routes)**: domain/ mandatory, one folder per feature

## Enforcement

The rules are automatically tested in `tests/architecture/layers.test.ts`.

```bash
npm run test:arch
```

Add rules as the project grows.

## Concrete example

**Before (logic in the API route):**
```typescript
// app/api/items/route.ts — TOO much logic here
export const POST = withErrorHandler(async (request) => {
    const user = await getUser();
    const body = await request.json();
    // validation, business rules, DB queries...
    const items = await db.insert(itemsTable).values({...}).returning();
    // notification, analytics...
    return apiSuccess(items);
});
```

**After (logic in domain/):**
```typescript
// domain/items/create.ts
export async function createItem(userId: string, data: CreateItemInput) {
    // validation, business rules
    const [item] = await db.insert(itemsTable).values({ user_id: userId, ...data }).returning();
    // notification, analytics
    return item;
}

// app/api/items/route.ts — thin layer
export const POST = withErrorHandler(async (request) => {
    const user = await getUser();
    const body = await request.json();
    const item = await createItem(user.id, body);
    return apiSuccess(item, 201);
});
```

## Reference

Pattern inspired by production SaaS projects (1000+ commits):
- `src/core/` = infrastructure (20+ modules)
- `src/domain/{feature}/` = business logic (15+ modules)
- ADRs documenting architectural decisions
