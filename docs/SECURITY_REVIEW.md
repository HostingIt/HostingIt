# HostingIt Security Review

**Date:** 2026-10-01
**Reviewed commit:** `079137a`
**Scope:** `apps/web` (Next.js 16 panel, Auth.js v5, Drizzle/Postgres), `packages/dokploy-client`, Docker/Compose files, GitHub Actions workflows.
**Method:** Manual source review of every API route, the middleware, the auth/MFA libraries, the Dokploy and GitHub integrations, and the deployment config. The parts of upstream Dokploy (`canary` branch) that consume values this panel forwards were read directly. `npm audit` was run.

## Threat model

- HostingIt is a **multi-tenant** PaaS: any GitHub/Google user can self-serve a free app.
- Each tenant controls build configuration, source code, and runtime code, all running on **shared** Dokploy infrastructure.
- The panel holds an **admin-scoped Dokploy API key**. Dokploy was designed for trusted operators, so every tenant-controlled value the panel forwards to Dokploy crosses a trust boundary Dokploy itself does not defend. The panel is the only place that boundary can be enforced.

## What is already solid

Authorization is consistent and correct: every app route scopes by `eq(apps.userId, …)` or `getOwnedApp()`, deployment-log reads are gated by `assertDeploymentBelongsToApp`, and all admin routes go through `requireApiAdmin`. No IDOR, SQL injection (Drizzle is parameterized throughout), or authorization bypass was found. 2FA is mandatory and enforced in two layers (middleware + `requireApiUser`); enrollment cannot overwrite an existing secret; the pending secret is user-bound and GCM-encrypted. GitHub App install binding verifies a signed state **and** personal-account ownership. Secrets are kept out of logs and client errors (`sanitizeDeployLogs`, `toClientError`), and env secrets are masked on read.

## Summary

| ID | Severity | Title |
|----|----------|-------|
| C-1 | **Critical** | Tenant build settings forwarded unvalidated to Dokploy, which uses them unquoted in shell commands and unchecked in filesystem paths |
| H-1 | **High** | Tenant apps served from subdomains of the panel's own registrable domain (cookie tossing / shared-origin risk); session cookie lacks `__Host-` scope |
| H-2 | **High** | TOTP brute-force throttle is per-IP, in-memory, and keyed on a client-controllable header |
| M-1 | Medium | Unbounded log `tail` / indefinite SSE polling (resource exhaustion) |
| M-2 | Medium | OAuth sign-in auto-links accounts by email without requiring a verified-email claim |
| M-3 | Medium | Single `AUTH_SECRET` reused for every cryptographic purpose (no key separation) |
| M-4 | Medium | CSP allows `unsafe-inline`/`unsafe-eval`; no HSTS header |
| L-1…L-6 | Low | See below |

---

## Critical

### C-1. Unvalidated build configuration reaches shell commands and filesystem paths on the Dokploy host

**Where (panel):**
- `apps/web/src/app/api/apps/route.ts` (createAppSchema) — `buildPath`, `dockerfile`, `dockerContextPath`, `dockerBuildStage` are only `z.string().max(256)`, no character validation.
- `apps/web/src/app/api/apps/[id]/settings/route.ts` (updateSettingsSchema) — same fields plus `publishDirectory`, length-limited only.
- `apps/web/src/lib/deploy-git.ts` — `buildPath` is only slash-normalized before becoming Dokploy's `customGitBuildPath`.
- `packages/dokploy-client/src/index.ts` (`saveBuildType`, `saveGitProvider`) — values forwarded verbatim.

**What happens upstream (verified against Dokploy `canary`):**
- `packages/server/src/db/schema/application.ts` — `apiSaveBuildType` / `apiSaveGitProvider` validate only the **branch** (`VALID_BRANCH_REGEX`). `dockerfile`, `dockerContextPath`, `dockerBuildStage`, `customGitBuildPath`, and `publishDirectory` are accepted as arbitrary strings.
- `packages/server/src/utils/filesystem/directory.ts` (`getBuildAppDirectory`, `getDockerContextPath`) builds paths with `path.join(APPLICATIONS_PATH, appName, "code", <tenant value>)` — `..` segments escape the app's build directory.
- `packages/server/src/utils/builders/docker-file.ts` places the Dockerfile path, context path, and build stage on the command line via `docker ${commandArgs.join(" ")}` **without shell quoting** (env vars and build args *are* quoted; these are not). `--target ${dockerBuildStage}` and `-f <dockerFilePath>` are the clearest injection points.

**Impact:** An authenticated, MFA-verified owner of any app (including a free-tier account) can set a value such as `dockerBuildStage = "x --label a=$(id)"` or a payload containing `;`/backticks/whitespace, and trigger a build. The string is executed by the shell on the shared Dokploy build host, and `..` in path fields reads/writes outside the app directory. For a multi-tenant PaaS this is a tenant-to-host escape — the exact boundary the product exists to protect.

**Fix:** Validate/allow-list these fields in the panel before forwarding — do not rely on the backend to quote. Suggested:
- `dockerBuildStage`, image/stage names: `^[A-Za-z0-9_.-]{1,100}$`.
- `dockerfile`, `dockerContextPath`, `buildPath`, `publishDirectory`: `^[A-Za-z0-9_./-]+$`, reject any `..` segment and any leading `/` you don't intend, reject whitespace and shell metacharacters.
- Apply the same rules in both `createAppSchema` and `updateSettingsSchema`, plus `deploy-git.ts`.

---

## High

### H-1. Tenant apps live on subdomains of the panel's own registrable domain

**Where:** `lib/dokploy.ts` (`getAppHostname` → `fhusr-{slug}.hostingit.online`); panel runs on `hostingit.online`. `lib/auth.ts` uses NextAuth defaults with no custom `cookies` block, so the session cookie is `authjs.session-token` / `__Secure-authjs.session-token` — host-scoped but **without the `__Host-` prefix**.

**Impact:** `hostingit.online` is a single registrable domain (not on the Public Suffix List), and tenant-controlled apps are served from sibling subdomains under it. A malicious tenant app can set cookies on the parent domain (`.hostingit.online`) — classic **cookie tossing** — and can abuse the shared site origin for same-site request forgery against the panel. Because the panel's session cookie is not `__Host-`-scoped, it is not protected against a sibling-subdomain cookie of the same name being injected.

**Fix:**
- Serve tenant apps from a **separate registrable domain** (e.g. `*.hostingitapps.online`) so tenant content never shares an origin/registrable domain with the panel. This is the robust fix.
- Independently, set the panel session cookie with the `__Host-` prefix (NextAuth `cookies.sessionToken`), which pins it to the exact host and `Path=/` and blocks subdomain cookie tossing.
- Keep CSRF protections (SameSite + state) and ensure the free-subdomain prefix cannot collide with panel paths.

### H-2. TOTP brute-force protection is per-IP, in-memory, and keyed on a spoofable header

**Where:** `lib/rate-limit.ts` — `getClientIp()` returns the **first** `X-Forwarded-For` entry (client-controllable behind Traefik, which appends rather than replaces). Limiter state is a per-process `Map`. Keys look like `totp-verify:${userId}:${ip}`.

**Impact:** An attacker varies `X-Forwarded-For` to get a fresh bucket per request, nullifying the 5-attempt lockout on TOTP **verification** (`auth/2fa/verify`), enrollment, account deletion, and avatar upload. A 6-digit TOTP is then brute-forceable by anyone holding a pre-2FA session — defeating 2FA in precisely the first-factor-compromise scenario it exists for. The in-memory store also means limits reset on every redeploy and are not shared across replicas.

**Fix:** Derive the client IP from a **trusted** proxy hop (a fixed offset from the right of `X-Forwarded-For`, or Traefik's real-IP), not the leftmost value. Back the limiter with Redis/Postgres (Redis is already wired in compose) for durable, shared counts. Consider a per-user global attempt ceiling independent of IP.

---

## Medium

### M-1. Unbounded log `tail` and indefinite SSE polling
**Where:** `api/apps/[id]/logs/route.ts` and `logs/stream/route.ts` pass `Number(tail)` straight through with no upper bound; the stream polls Dokploy every 1.5s for the life of the connection. A tenant can request an enormous tail and/or open many streams, exhausting panel and Dokploy resources.
**Fix:** Clamp `tail` (e.g. `Math.min(Number(tail)||200, 2000)`), reject non-finite values, and cap concurrent streams per user.

### M-2. OAuth sign-in auto-links accounts by email without a verified-email guarantee
**Where:** `lib/oauth-user.ts` `handleOAuthUser` `byEmail` branch attaches a new provider to, and signs the user into, any existing account with a matching email. `parseGoogleProfile` takes `profile.email` without checking `email_verified`. GitHub's path (`resolveGitHubProfile`) does prefer a primary+verified email, which limits current exploitability, but the linking logic trusts the email claim implicitly.
**Fix:** Require a verified-email signal from each provider before email-based linking (check Google's `email_verified`; keep GitHub's verified-email fetch mandatory). Otherwise fall back to provider-id linking only.

### M-3. Single `AUTH_SECRET` reused for all cryptographic purposes
**Where:** `AUTH_SECRET` keys NextAuth JWTs, TOTP-secret encryption (`totp.ts` → `sha256(AUTH_SECRET)`), the MFA stamp, consent tokens, install state, and domain-verification tokens. One secret for everything means a leak in any context compromises all, and rotation is all-or-nothing.
**Fix:** Derive per-purpose subkeys via HKDF with distinct `info` labels, or introduce separate secrets for at-rest encryption vs. signing.

### M-4. CSP allows `unsafe-inline`/`unsafe-eval`; no HSTS
**Where:** `next.config.ts` — `script-src 'self' 'unsafe-inline' 'unsafe-eval'` weakens XSS containment, and there is no `Strict-Transport-Security` header.
**Fix:** Move to nonce-based scripts (drop `unsafe-eval` at minimum) and add `Strict-Transport-Security: max-age=63072000; includeSubDomains` (coordinate `includeSubDomains`/`preload` with the app-subdomain plan in H-1).

---

## Low / Informational

- **L-1. `buildArgs` returned unmasked.** `api/apps/[id]/env/route.ts` masks `env` and `buildSecrets` but returns `buildArgs` in cleartext; users sometimes misplace secrets there. Consider masking by key heuristic.
- **L-2. `Math.random()` token generator.** `lib/utils.ts` `generateToken` is not a CSPRNG. Currently unused — remove it so it can't be adopted for security tokens later.
- **L-3. Vestigial `password_hash` column** (`db/schema.ts`) with no credentials provider — drop to reduce confusion and attack surface.
- **L-4. Dokploy project adoption via 8-char ID prefix.** `lib/dokploy-user.ts` resolves projects by name `hostingit-${user.id.slice(0,8)}`; a UUID-prefix collision would let one tenant adopt (and on account/app deletion, delete) another's project. Low probability, but use the full user id in the project name.
- **L-5. `npm audit`:** 4 *moderate* advisories, all dev-only (`esbuild`/`drizzle-kit`); nothing in the production runtime. Next `16.3.8`, next-auth `5.0.0-beta.32`.
- **L-6. Minor:** MFA session validity is 12h and TOTP codes are replayable within their window (no used-code tracking); `/api/legal/accept` and the 2FA enroll/verify routes are reachable by suspended / not-yet-verified sessions (no sensitive effect); the health endpoint discloses configuration presence by design.

---

## Priorities

1. **C-1** — validate build-config fields before they reach Dokploy (tenant→host escape).
2. **H-1 / H-2** — separate the tenant app domain + `__Host-` cookie, and fix client-IP derivation so 2FA throttling can't be spoofed.
3. **M-1…M-4** — clamp log tail, require verified-email for linking, separate crypto keys, tighten CSP/HSTS.
