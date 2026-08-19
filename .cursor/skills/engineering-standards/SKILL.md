---
name: engineering-standards
description: HostingIt baseline engineering standards applied to every change. Use on all implementation, refactor, and fix work in this repository.
---

# Engineering Standards

Apply these standards on **every** change unless the user explicitly overrides them.

## Scope and diff discipline

- **Minimize scope** — smallest correct diff. No drive-by refactors, unrelated formatting, or feature creep.
- **Match existing conventions** — read surrounding code first; mirror naming, imports, file layout, and abstraction level.
- **No over-engineering** — no premature abstractions, extra config layers, or speculative error handling for unlikely edges.
- **Comments sparingly** — only for non-obvious business logic or external constraints (Dokploy, GitHub App, DNS).
- **No new markdown/docs** unless the user asks.

## Repository layout

```
apps/web/                  # Next.js control panel + API routes
packages/dokploy-client/   # Typed deploy-platform client (workspace package)
```

- App code lives in `apps/web/src/` (`app/`, `components/`, `lib/`, `db/`).
- Shared deploy API types/client: `@hostingit/dokploy-client` — extend there, don't duplicate fetch logic in routes.
- Run workspace scripts from repo root: `npm run dev`, `lint`, `typecheck`, `build`.

## TypeScript and Next.js

- **Strict typing** — no `any` unless unavoidable; prefer narrow types and Drizzle-inferred shapes.
- **App Router** — Server Components by default; add `"use client"` only when hooks, browser APIs, or local state are required.
- **Route handlers** — `params` is `Promise<{ id: string }>`; always `await params`.
- **Auth** — use `getSession()` / `requireAuth()` / `requireAdmin()` from `@/lib/session`. Never trust client-side role checks alone.
- **Ownership** — API routes touching apps must filter by `session.user.id` (or admin path). Return `404` for missing *or* unauthorized resources to avoid IDOR leaks.
- **Responses** — `NextResponse.json({ error: "..." }, { status })` with consistent error shapes.

## Database (Drizzle)

- Schema changes go in `apps/web/src/db/schema.ts`; generate migrations with `npm run db:generate`.
- Use parameterized Drizzle queries — never string-concatenate SQL.
- Prefer `eq`, `and`, `limit(1)` for single-row fetches.

## UI and styling

- Use **CSS design tokens** from `globals.css` (`--background`, `--surface`, `--foreground`, `--muted`, `--border`, `--accent`). Do not hardcode `bg-white`, `text-zinc-*`, or light-only colors.
- Reuse shared primitives: `Button`, `Input`, `Card`, `Alert`, `PageHeader`, `FormSection`.
- Support **light and dark mode** for every new surface.
- Dashboard chrome: top nav via `dashboard-top-nav.tsx`; content width `max-w-6xl`.

## Secrets and git

- **Never commit** `.env`, `.env.local`, PEM keys, API keys, or tokens.
- Server-only env: `DOKPLOY_*`, `AUTH_*`, `GITHUB_APP_*`, `DATABASE_URL`. Client-safe: `NEXT_PUBLIC_*` only.
- Do not log secrets, tokens, or full webhook payloads.

## Verification before done

After substantive changes, run from repo root:

```bash
npm run typecheck
npm run lint
npm run build
```

Fix failures before finishing. Mention if a step was skipped and why.

## Commits and PRs

- **Do not commit** unless the user explicitly asks.
- When asked to commit: concise message focused on *why*; never stage secret files.

## Product context

HostingIt is managed Docker hosting for indie devs — GitHub App deploys via Dokploy, mandatory 2FA, plan tiers (free/pro). Best-effort hobby hosting, not mission-critical SLA.
