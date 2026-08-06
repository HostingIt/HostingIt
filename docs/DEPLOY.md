# Deploy HostingIt to production (Dokploy)

Two pieces:

1. **HostingIt panel** (this repo) — Next.js control plane  
2. **Dokploy** — already running; HostingIt calls it via `DOKPLOY_API_URL` / `DOKPLOY_API_KEY`

User apps deploy *through* Dokploy. The panel itself is also just an app you host on that same Dokploy (or another VPS).

---

## A. One-time prep

### 1. Postgres for the panel

In Dokploy, create a **PostgreSQL** database (or use compose below). Note the connection URL:

```text
postgresql://USER:PASSWORD@HOST:5432/hostingit
```

### 2. Push schema (first time)

From your laptop (with prod `DATABASE_URL`):

```bash
cd HostingIt
export DATABASE_URL='postgresql://...'   # prod panel DB
npm ci
npm run db:push
```

### 3. Secrets checklist

| Variable | Notes |
|----------|--------|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | Same as public panel URL, e.g. `https://hostingit.online` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_APP_URL` | Public panel URL (**also Docker build-arg**) |
| `NEXT_PUBLIC_BASE_DOMAIN` | e.g. `hostingit.online` (**build-arg**) |
| `NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX` | e.g. `fhusr` (**build-arg**) |
| `DATABASE_URL` | Panel Postgres |
| `DOKPLOY_API_URL` / `DOKPLOY_API_KEY` | Your Dokploy instance |
| OAuth + GitHub App vars | See `.env.example` |

### 4. OAuth + GitHub App URLs (production)

Point these at the **panel** domain:

- GitHub OAuth callback: `https://YOUR_PANEL/api/auth/callback/github`
- Google OAuth callback: `https://YOUR_PANEL/api/auth/callback/google`
- GitHub App setup URL: `https://YOUR_PANEL/api/github/app/callback`
- GitHub App webhook: `https://YOUR_PANEL/api/github/app/webhook`

### 5. DNS

- Panel: `hostingit.online` / `www` → Dokploy / Traefik for the **panel** app  
- User apps: `*.hostingit.online` → same Dokploy (Cloudflare orange cloud OK for free SSL)

---

## B. GitHub Actions → GHCR (recommended)

GitHub-hosted runners build the image on every push to `main` and publish to:

`ghcr.io/hostingit/hostingit:latest`  
(same as `ghcr.io/<owner>/<repo>:latest` — lowercase)

### Enable the workflow

1. Repo **Settings → Actions → General** — allow Actions / read-write for `GITHUB_TOKEN` (packages).
2. **Settings → Packages** — after the first push, make `hostingit` package **Public**, or create a classic PAT / fine-grained token with `read:packages` for Dokploy private pulls.
3. Optional **Variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://hostingit.online` |
| `NEXT_PUBLIC_BASE_DOMAIN` | `hostingit.online` |
| `NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX` | `fhusr` |

4. Push to `main` (or run **Publish image** → *Run workflow*).
5. Check **Actions** tab → *Publish image* succeeds.
6. Package URL: `https://github.com/orgs/HostingIt/packages` (or your user/org packages).

### Private GHCR + Dokploy

If the package is private, in Dokploy add a **Docker registry** credential:

- Registry: `ghcr.io`
- Username: your GitHub username  
- Password: PAT with `read:packages` (or `GITHUB_TOKEN` equivalent)

---

## C. Create the panel app in Dokploy

### Option 1 — Docker image from GHCR (best with Actions)

1. Dokploy → **Create Application** → provider **Docker**.
2. Image: `ghcr.io/hostingit/hostingit:latest`  
(same as `ghcr.io/<owner>/<repo>:latest` — lowercase)
3. Registry credentials if private.
4. Port: **3000**
5. Add **all runtime env vars** from `.env.example` (not only `NEXT_PUBLIC_*` — those were baked at image build; still set them for server-side redirects).
6. Domain: `hostingit.online` (HTTPS on).
7. Deploy.

Redeploy after each successful Actions publish (or enable auto-pull if Dokploy supports it).

### Option 2 — Build from GitHub with Dockerfile (no GHCR)

1. Dokploy → **Create Application** → **GitHub** → this repo.
2. Build type: **Dockerfile**
3. Dockerfile path: `apps/web/Dockerfile`
4. Docker context: `.` (repo root) — **important** (monorepo).
5. Build arguments:

```text
NEXT_PUBLIC_APP_URL=https://hostingit.online
NEXT_PUBLIC_BASE_DOMAIN=hostingit.online
NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX=fhusr
```

6. Port **3000**, env vars, domain, deploy.

### Option 3 — Compose on the server

```bash
# on the VPS, after logging into ghcr.io
docker compose -f docker-compose.prod.yml up -d
```

Still put Traefik/Dokploy domain in front of port 3000.

---

## D. Verify

```bash
curl -sS https://YOUR_PANEL/api/health
# expect: "status":"ok","deploy":"connected"
```

Then: sign in → 2FA → install GitHub App → create a test app.

---

## E. What you do vs what runners do

| Step | Who |
|------|-----|
| Push code to `main` | You |
| Lint / typecheck / build | GitHub Actions `CI` |
| Build & push `ghcr.io/.../hostingit` | GitHub Actions `Publish image` |
| Pull image + run container + TLS | Dokploy |
| Panel Postgres + `db:push` | You (once / when schema changes) |
| OAuth / GitHub App / DNS / Dokploy API key | You |

No self-hosted runner is required — GitHub-hosted `ubuntu-latest` is enough. Only add a [self-hosted runner](https://docs.github.com/en/actions/hosting-your-own-runners) if you want builds on your VPS instead of GitHub’s cloud.
