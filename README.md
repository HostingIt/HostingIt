# HostingIt

Managed Docker hosting for indie developers. Deploy GitHub repos from a simple control panel — live URLs with SSL in minutes.

> Best-effort hosting for hobby projects and small applications. Not suitable for mission-critical production workloads.

## Stack

- **Frontend/API:** Next.js 15 (App Router)
- **Auth:** Auth.js (GitHub + Google OAuth, mandatory TOTP 2FA)
- **Database:** PostgreSQL + Drizzle ORM
- **Deploy backend:** Platform API (internal)

## Project structure

```
HostingIt/
├── apps/web/                 # Next.js control panel + marketing
├── packages/dokploy-client/    # Typed deploy platform API client (internal)
├── docker-compose.dev.yml    # Local Postgres + Redis
└── .github/workflows/ci.yml
```

## Local development

### Prerequisites

- Node.js 20+
- Docker (for Postgres)

### Setup

```bash
# Clone and install
git clone git@github.com:HostingIt/HostingIt.git
cd HostingIt
npm install

# Start Postgres + Redis
docker compose -f docker-compose.dev.yml up -d

# Configure environment
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your values

# Push database schema
npm run db:push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local subdomain testing (`fhusr-*.hostingit.online`)

The panel runs on localhost, but **apps still deploy to your remote Dokploy** instance. Free apps get first-level hostnames like `fhusr-my-api.hostingit.online` (Cloudflare orange cloud + free Universal SSL compatible).

1. In `apps/web/.env.local`:
   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_BASE_DOMAIN=hostingit.online
   NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX=fhusr
   DOKPLOY_API_URL=https://your-dokploy-host
   DOKPLOY_API_KEY=your-key
   ```
2. In Cloudflare for `hostingit.online`, add **`*`** → Dokploy VPS origin IP. **Proxied (orange cloud)** is fine.
3. Restart the dev server after env changes (`npm run dev`).
4. Create an app — live URL looks like `https://fhusr-my-api.hostingit.online`.

Keep the apex (`@`) pointed at the **panel** server. More-specific records (e.g. `www`) override the wildcard.

OAuth callbacks for local dev stay on `http://localhost:3000/api/auth/callback/...` (unchanged).

### Environment variables

Copy `.env.example` to `apps/web/.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app credentials |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth app credentials |
| `DOKPLOY_API_URL` | Deploy platform API URL (internal, server-side) |
| `DOKPLOY_API_KEY` | Deploy platform API key (server-side only) |
| `NEXT_PUBLIC_BASE_DOMAIN` | Apex domain for free app hostnames (`hostingit.online`) |
| `NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX` | Prefix for free apps (`fhusr` → `fhusr-{slug}.…`) |
| `ADMIN_EMAIL` | Bootstrap admin account email (must match OAuth email) |

### OAuth callback URLs

- GitHub: `{NEXT_PUBLIC_APP_URL}/api/auth/callback/github`
- Google: `{NEXT_PUBLIC_APP_URL}/api/auth/callback/google`

### GitHub App (required for multi-user deploys)

Users install the **HostingIt GitHub App** and grant repos. Deploys use short-lived installation tokens (not a shared Dokploy GitHub connection).

1. Create a GitHub App: [github.com/settings/apps/new](https://github.com/settings/apps/new)
2. Set:
   - **Setup URL:** `{NEXT_PUBLIC_APP_URL}/api/github/app/callback`
   - **Webhook URL:** `{NEXT_PUBLIC_APP_URL}/api/github/app/webhook`
   - **Webhook secret:** random string → `GITHUB_APP_WEBHOOK_SECRET`
   - Permissions: **Contents: Read**, **Metadata: Read**
   - Events: **Push**, **Installation**, **Installation repositories**
   - Where can it be installed? **Any account**
3. Generate a private key; put PEM in `GITHUB_APP_PRIVATE_KEY` (use `\n` for newlines) or base64
4. Set `GITHUB_APP_ID` (numeric) and `GITHUB_APP_SLUG` (app URL name)
5. Users: **Settings → Install GitHub App** → grant repos → **New App**

### Authentication flow

1. Sign in with GitHub or Google
2. First login: scan QR code and enroll mandatory 2FA (Google Authenticator / Authy)
3. Every login: enter 6-digit TOTP code after OAuth
4. Google-only users must connect GitHub in Settings to deploy repos

## Platform setup (operators)

1. Provision your deploy infrastructure on Oracle Cloud Instance 1
2. Generate an API key in the platform admin settings
3. Connect GitHub in the platform settings (for repo pulls)
4. Set wildcard DNS: `*.yourdomain.com` → Instance 1
5. Add `DOKPLOY_API_URL` and `DOKPLOY_API_KEY` to HostingIt env

## Deployment (production)

Full guide: **[docs/DEPLOY.md](docs/DEPLOY.md)**

Summary:

1. Create Postgres for the panel → `npm run db:push` against it once  
2. GitHub Actions publishes `ghcr.io/hostingit/hostingit:latest` on push to `main`  
3. In Dokploy, create an app from that image (port **3000**) or build with `apps/web/Dockerfile` (context = repo root)  
4. Set env vars from `.env.example` + domain + OAuth/GitHub App callbacks  

```bash
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_APP_URL=https://hostingit.online \
  --build-arg NEXT_PUBLIC_BASE_DOMAIN=hostingit.online \
  --build-arg NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX=fhusr \
  -t hostingit .
```

## Plans

| Plan | Price | Apps | RAM/app | Custom domain |
|------|-------|------|---------|---------------|
| Free | $0 | 1 | 256 MB | No (subdomain) |
| Pro | $10/mo | 5 | 512 MB | Yes |
| Enterprise | Coming soon | Custom | Dedicated | Yes |

Pro is activated manually via the admin panel after UPI/PayPal/bank payment. See `/pricing` for a comparison with Railway.

## Roadmap

See [docs/FUTURE_PLANS.md](docs/FUTURE_PLANS.md) for upcoming work:

- **HostingIt Infra** — team-scaled infrastructure for paid tiers
- **Multi-setup** — multi-node routing, regions, central proxy

Public roadmap page: `/docs/roadmap` when the panel is running.

## API health check

```
GET /api/health
```

Returns deploy platform connectivity status.

## License

Private — all rights reserved.
