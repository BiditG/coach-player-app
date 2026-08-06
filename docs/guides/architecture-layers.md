# Architecture Layers Guide

## Principe

Separer l'infrastructure partagee (utils/) de la logique metier (domain/) pour eviter le couplage.

## Structure recommandee

```
project/
├── utils/                  # Infrastructure partagee
│   ├── api/               # error-handler, rate-limit, auth-middleware
│   ├── db/                # Drizzle client, schema, migrations
│   ├── supabase/          # Client Supabase (auth, cookies)
│   └── stripe/            # Stripe helpers
├── domain/                # Logique metier (creer quand le projet grandit)
│   └── {feature}/         # Un dossier par feature/vertical
│       ├── actions.ts     # Server actions
│       ├── queries.ts     # Data access
│       └── types.ts       # Types metier
├── components/            # UI components (React)
│   ├── ui/               # shadcn/ui primitives
│   └── {feature}/        # Composants par feature
├── app/                   # Routes Next.js (thin layer)
│   ├── api/              # API routes (appellent domain/)
│   └── (pages)/          # Pages (appellent domain/ ou actions)
└── lib/                   # Helpers specifiques framework (rare)
```

## Regles d'import

```
app/ ──> domain/ ──> utils/
  │         │
  └──> components/
```

| Depuis | Peut importer | NE DOIT PAS importer |
|--------|--------------|---------------------|
| `app/` | domain/, utils/, components/ | — |
| `domain/` | utils/ | app/, components/ |
| `components/` | utils/supabase/ (auth only) | utils/db/, domain/ |
| `utils/` | autres utils/ | app/, components/, domain/ |

## Quand creer domain/

- **MVP (< 10 routes API)**: pas necessaire, utils/ suffit
- **Croissance (10-30 routes)**: extraire la logique metier dans domain/
- **Scale (30+ routes)**: domain/ obligatoire, un dossier par feature

## Enforcement

Les regles sont testees automatiquement dans `tests/architecture/layers.test.ts`.

```bash
npm run test:arch
```

Ajouter des regles au fur et a mesure que le projet grandit.

## Exemple concret

**Avant (logique dans la route API):**
```typescript
// app/api/items/route.ts — TROP de logique ici
export const POST = withErrorHandler(async (request) => {
    const user = await getUser();
    const body = await request.json();
    // validation, business rules, DB queries...
    const items = await db.insert(itemsTable).values({...}).returning();
    // notification, analytics...
    return apiSuccess(items);
});
```

**Apres (logique dans domain/):**
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

Pattern inspire de projets SaaS en production (1000+ commits):
- `src/core/` = infrastructure (20+ modules)
- `src/domain/{feature}/` = logique metier (15+ modules)
- ADRs documentant les decisions architecturales
