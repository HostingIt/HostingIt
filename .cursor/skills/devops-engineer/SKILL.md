---
name: devops-engineer
description: DevOps and infrastructure guidance for HostingIt — Dokploy deploys, Docker, GitHub App webhooks, Cloudflare DNS, CI/CD, and environment configuration. Use when working on deployment, infra, DNS, containers, env vars, or platform operations.
disable-model-invocation: true
---

# DevOps Engineer

Operate as a senior DevOps engineer for HostingIt's deploy stack.

## Architecture overview

```
Users → HostingIt panel (Next.js, Instance 2)
              ↓ Dokploy API
        Dokploy (Instance 1) → user app containers
              ↑ GitHub App (install tokens, webhooks)
Cloudflare DNS: *.hostingit.online → Dokploy VPS
```

- **Panel** deploys to its own host; **user apps** deploy to Dokploy via `@hostingit/dokploy-client`.
- Local dev uses `docker-compose.dev.yml` (Postgres + Redis); Dokploy remains remote.

## Environment variables

| Variable | Scope | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Server | Postgres for panel |
| `AUTH_SECRET`, `AUTH_*` | Server | Auth.js OAuth |
| `DOKPLOY_API_URL`, `DOKPLOY_API_KEY` | Server only | Never `NEXT_PUBLIC_` |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET` | Server | PEM via env or base64 |
| `NEXT_PUBLIC_APP_URL` | Client | Panel URL for OAuth callbacks |
| `NEXT_PUBLIC_BASE_DOMAIN` | Client | Apex domain (`hostingit.online`) |
| `NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX` | Client | Free tier label prefix (`fhusr`) |

Validate: secrets stay server-side; only public config uses `NEXT_PUBLIC_`.

## DNS (Cloudflare)

- Wildcard `*` → Dokploy VPS IP (proxied/orange cloud OK for Universal SSL).
- Apex `@` → panel server (more specific records override wildcard).
- Free app URLs: `https://{prefix}-{slug}.{baseDomain}` (single label, SSL-friendly).

## GitHub App

- **Setup URL:** `{APP_URL}/api/github/app/callback`
- **Webhook:** `{APP_URL}/api/github/app/webhook` — verify signature with `GITHUB_APP_WEBHOOK_SECRET`
- Permissions: Contents Read, Metadata Read; events: Push, Installation, Installation repositories
- Deploy flow uses installation tokens — not a shared Dokploy GitHub OAuth connection

## Dokploy operations

- Client package: `packages/dokploy-client` — add new API methods there with typed inputs/outputs.
- Per-user Dokploy project/environment stored on `users`; apps reference Dokploy application IDs.
- Common failures: stale env IDs → `ensureUserDokployEnvironment()`; git sync validation → required fields like `watchPaths`.
- App lifecycle: create → deploy → start/stop/redeploy via API routes under `/api/apps/[id]/`.

## Docker and CI

**Panel Dockerfile:** `apps/web/Dockerfile` — build from monorepo root context.

**CI** (`.github/workflows/ci.yml`): Node 22, `npm ci`, lint, typecheck, build with placeholder env.

Before changing CI or Dockerfile:
- Build must pass without real Dokploy/GitHub credentials.
- Keep workspace build: `npm run build --workspace=apps/web`.

## Operational checklist

When adding deploy-related features:

- [ ] Webhook handler validates signature and rejects replayed/unsigned payloads
- [ ] Idempotent handling for GitHub `installation` / `push` events
- [ ] Deploy errors surfaced to user without leaking internal stack traces
- [ ] Resource limits respect plan tier (RAM, app count)
- [ ] Logs/metrics routes scoped to app owner

## Local dev tips

```bash
docker compose -f docker-compose.dev.yml up -d
cp .env.example apps/web/.env.local
npm run db:push && npm run dev
```

Restart dev server after env changes. OAuth callbacks stay on `localhost:3000`; deployed apps use production subdomains.

See [engineering-standards](../engineering-standards/SKILL.md) for git/secrets rules.
