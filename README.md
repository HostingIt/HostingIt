# HostingIt

Managed Docker hosting for indie developers. Deploy GitHub repos to Dokploy with a simple control panel.

> Best-effort hosting for hobby projects and small applications. Not suitable for mission-critical production workloads.

## Stack

- **Frontend/API:** Next.js 15 (App Router)
- **Auth:** Auth.js (credentials + GitHub OAuth)
- **Database:** PostgreSQL + Drizzle ORM
- **Deploy backend:** Dokploy API
- **Email:** Resend

## Project structure

```
HostingIt/
├── apps/web/                 # Next.js control panel + marketing
├── packages/dokploy-client/    # Typed Dokploy API wrapper
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
git clone git@github.com:vegeta2op/HostingIt.git
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

### Environment variables

Copy `.env.example` to `apps/web/.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app credentials |
| `DOKPLOY_API_URL` | Your Dokploy instance URL |
| `DOKPLOY_API_KEY` | Dokploy API key (server-side only) |
| `NEXT_PUBLIC_BASE_DOMAIN` | Base domain for subdomains |
| `ADMIN_EMAIL` | Bootstrap admin account email |
| `RESEND_API_KEY` | Email verification (optional in dev) |

## Dokploy setup

1. Install Dokploy on Oracle Cloud Instance 1
2. Generate an API key in Dokploy profile settings
3. Connect GitHub in Dokploy settings (for repo pulls)
4. Set wildcard DNS: `*.yourdomain.com` → Instance 1
5. Add `DOKPLOY_API_URL` and `DOKPLOY_API_KEY` to HostingIt env

## Deployment

Deploy HostingIt to Oracle Cloud Instance 2 via Dokploy:

1. Create a new Application in Dokploy pointing to this repo
2. Set build path to `apps/web`
3. Add all environment variables from `.env.example`
4. Assign domain `panel.yourdomain.com`

Or use the included Dockerfile:

```bash
docker build -f apps/web/Dockerfile -t hostingit .
```

## Plans

| Plan | Price | Apps | Custom domain |
|------|-------|------|---------------|
| Free | $0 | 1 | No |
| Starter | $5/mo | 3 | Yes |
| Pro | $10/mo | 10 | Yes |
| Business | Custom | 100 | Yes |

Paid plans are activated manually via the admin panel after UPI/PayPal/bank payment.

## API health check

```
GET /api/health
```

Returns Dokploy connectivity status.

## License

Private — all rights reserved.
