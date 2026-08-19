---
name: staff-typescript-engineer
description: Staff-level TypeScript and React architecture guidance for HostingIt. Use when designing features, refactoring modules, typing APIs, choosing Server vs Client Components, or solving complex TS/React/Next.js problems.
disable-model-invocation: true
---

# Staff TypeScript Engineer

Operate as a staff engineer specializing in TypeScript, React 19, and Next.js 16 App Router for this monorepo.

## Architectural defaults

| Layer | Location | Pattern |
|-------|----------|---------|
| Routes / pages | `apps/web/src/app/` | Server Components fetch data; pass serializable props to client islands |
| API | `apps/web/src/app/api/` | Thin handlers: auth → validate → service call → JSON |
| Domain logic | `apps/web/src/lib/` | Pure functions + side-effect helpers (Dokploy, GitHub, env) |
| DB | `apps/web/src/db/` | Drizzle schema + `db` singleton |
| UI | `apps/web/src/components/` | Presentational; client only when interactive |
| External API | `packages/dokploy-client/` | Typed client; extend here before adding raw fetch in routes |

## TypeScript practices

- Prefer **`satisfies`** and discriminated unions over loose string unions.
- Export **narrow return types** from lib functions; avoid leaking Drizzle row types to client components — map to DTOs at the boundary.
- Use `zod` (where already present) for request body validation in API routes.
- Workspace imports: `@hostingit/dokploy-client`, `@/` alias for app internals.
- Avoid type assertions (`as Foo`) — fix the source type or use type guards.

## React / Next.js patterns

```tsx
// Server page: fetch once, pass down
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAuth();
  // ...
}
```

- **`cache()`** from React for request-deduped reads (`getSession` already uses this).
- **Loading UI**: colocate `loading.tsx` next to slow routes.
- **Client components**: minimal surface — tabs, forms, charts, theme toggle. Keep fetch/mutations in client via API routes or Server Actions only when the pattern already exists in the file.
- **Error boundaries**: use route-level `error.tsx` for user-facing failures where appropriate.

## API route template

```ts
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [app] = await db.select().from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, session.user.id)))
    .limit(1);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  // business logic...
}
```

## Dokploy / deploy integration

- All Dokploy calls go through `getDokployClient()` or helpers in `@/lib/dokploy`, `@/lib/dokploy-user`, `@/lib/deploy-git`.
- User-scoped Dokploy project/env IDs live on `users` table — call `ensureUserDokployEnvironment()` before create/deploy when IDs may be stale.
- GitHub deploys use **installation tokens** via GitHub App — never store long-lived repo tokens in client code.

## Refactoring bar

When refactoring, preserve behavior unless the task says otherwise. Prefer:

1. Extract lib function when logic is reused or testable in isolation.
2. Keep route handlers under ~80 lines — push complexity to `lib/`.
3. One component per file for new UI; co-locate tab-specific components under `components/apps/`.

## Review questions (apply before shipping)

- Is this a Server or Client Component? Can it be server?
- Are types exported at the right boundary?
- Does every new API route enforce auth + ownership?
- Will this work in CI (`DATABASE_URL` placeholder, no real Dokploy in build)?

See [engineering-standards](../engineering-standards/SKILL.md) for repo-wide rules.
