---
name: security-review
description: Senior security engineer review for HostingIt — OWASP Top 10, auth bypass, IDOR, injection, secrets exposure, webhook trust, and multi-tenant isolation. Use when auditing security, reviewing sensitive changes, or hardening auth/deploy flows.
---

# Security Review

Operate as a senior application security engineer reviewing HostingIt — a multi-tenant hosting control panel with OAuth, mandatory 2FA, GitHub App deploys, and Dokploy orchestration.

## Threat model (priority order)

1. **Cross-tenant access** — User A reads/modifies User B's apps, env vars, logs, deployments
2. **Auth bypass** — Skip OAuth, 2FA, or admin checks
3. **Secret exfiltration** — Env vars, GitHub tokens, Dokploy keys, PEM files
4. **Webhook abuse** — Forged GitHub push/installation events triggering deploys
5. **Injection** — Command, SQL, XSS via user-controlled names, env values, log output
6. **Privilege escalation** — User → admin, free → pro without payment

## Review workflow

1. **Map trust boundaries** — browser, API routes, webhooks, Dokploy, GitHub
2. **Trace auth on every changed route** — session, MFA state, role
3. **Search for secrets** — keys, PEMs, tokens in diff and repo
4. **Test mentally for IDOR** — swap `{id}` UUIDs across users
5. **Report** with severity and concrete remediation

## HostingIt-specific checks

### Authentication & session

- [ ] `getSession()` / JWT callbacks enforce `mfaVerified` where required
- [ ] Admin routes use `requireAdmin()` server-side
- [ ] OAuth linking cannot hijack another user's account
- [ ] Session cookies: HTTP-only, Secure in production, sensible expiry

### Authorization (IDOR)

Every `/api/apps/[id]/*` handler must:

```ts
.where(and(eq(apps.id, id), eq(apps.userId, session.user.id)))
```

- [ ] Env var routes cannot read/write another user's secrets
- [ ] Logs, metrics, deployments, control (start/stop) scoped to owner
- [ ] Admin routes explicitly gated — no accidental exposure via shared helpers

### Secrets & env vars

- [ ] `DOKPLOY_*`, `GITHUB_APP_PRIVATE_KEY`, `AUTH_SECRET` never in client bundle
- [ ] User app env vars encrypted at rest if stored (check current pattern)
- [ ] API responses strip `githubAccessToken`, `totpSecret`, internal Dokploy IDs from clients that don't need them
- [ ] `.gitignore` excludes `.env*`, `*.pem`; no keys in git history in diff

### GitHub App webhooks

- [ ] Signature verified with `GITHUB_APP_WEBHOOK_SECRET` before processing
- [ ] Installation events cannot attach repos to wrong user
- [ ] Push events deploy only repos the user granted and owns

### Dokploy / deploy

- [ ] User input (app name, slug, domain) sanitized — no shell metacharacters in deploy commands
- [ ] Custom domains validated; no SSRF via user-supplied URLs in server fetch
- [ ] Deploy failures don't leak Dokploy internal errors to clients

### Injection & XSS

- [ ] Drizzle only — no raw SQL concatenation
- [ ] No `dangerouslySetInnerHTML` with user content
- [ ] Log viewers escape or safely render untrusted deploy output
- [ ] Env var keys/values validated with existing zod schema

### Dependencies

- [ ] Run or recommend `npm audit` for new dependencies
- [ ] Pin sensitive integrations; review supply-chain risk for install scripts

## Severity ratings

| Level | Criteria |
|-------|----------|
| **Critical** | Exploitable without auth, full account takeover, cross-tenant data access, secret leak |
| **High** | Auth bypass with conditions, stored XSS, webhook forgery |
| **Medium** | Missing rate limits, verbose errors, weak validation |
| **Low** | Defense-in-depth gaps, missing headers, informational |

## Report format

```markdown
## Security assessment
<Overall risk: Low / Medium / High / Critical>

## Findings

### Critical
| File | Issue | Impact | Remediation |
|------|-------|--------|-------------|

### High / Medium / Low
...

## Verified secure
- <what was checked and passed>

## Recommended follow-ups
- Pen test scope, automated scanning (trivy, npm audit), CSP headers, rate limiting
```

Be precise: file path, vulnerable pattern, exploit scenario, fix. Do not flag theoretical issues without a plausible path in this codebase.

See [engineering-standards](../engineering-standards/SKILL.md) for secrets/git rules.
