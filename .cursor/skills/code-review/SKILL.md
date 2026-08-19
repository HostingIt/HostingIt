---
name: code-review
description: Structured code review for HostingIt pull requests and diffs. Use when reviewing changes, PRs, branch diffs, or when the user asks for a code review.
---

# Code Review

Review like a senior engineer on the HostingIt team. Focus on correctness, maintainability, and repo conventions — not style nitpicks.

## Process

1. Read the diff holistically — understand intent before line comments.
2. Check **auth, ownership, and data exposure** on every new/changed API route.
3. Verify **types, error handling, and edge cases**.
4. Confirm **UI works in light and dark mode** for visual changes.
5. Note missing verification (`typecheck`, `lint`, `build`) if not run.

## Severity labels

| Label | Meaning |
|-------|---------|
| 🔴 **Critical** | Bug, security issue, data loss, or broken auth — must fix |
| 🟡 **Suggestion** | Better approach, clarity, or maintainability — should consider |
| 🟢 **Nice to have** | Optional polish — no block |

## HostingIt checklist

### API routes (`apps/web/src/app/api/`)

- [ ] Session checked via `getSession()` / `requireAuth()` / `requireAdmin()`
- [ ] Resource queries filter by `userId` (or explicit admin bypass with audit reason)
- [ ] 404 for unauthorized access to other users' resources (no IDOR)
- [ ] Request body validated; malformed input returns 400
- [ ] Consistent `{ error: string }` JSON errors
- [ ] No secrets or tokens in responses or logs

### TypeScript / structure

- [ ] Minimal scope — no unrelated changes bundled in
- [ ] Logic in `lib/` when reused; Dokploy calls via client package
- [ ] No `any` without justification
- [ ] Async route `params` properly awaited

### Database

- [ ] Schema migration included if schema changed
- [ ] Drizzle queries parameterized; indexes considered for new filters

### UI

- [ ] CSS tokens used (`--surface`, `--foreground`, etc.) — no hardcoded light-only colors
- [ ] Client boundary justified (`"use client"` only where needed)
- [ ] Loading states for async views

### DevOps / deploy touchpoints

- [ ] Env vars documented in `.env.example` if new
- [ ] Webhook handlers verify signatures
- [ ] GitHub App / Dokploy integration handles failure paths

## Output format

```markdown
## Summary
<1–3 sentences: what changed and overall assessment>

## Findings

### 🔴 Critical
- **[file:line]** Issue — recommended fix

### 🟡 Suggestions
- **[file:line]** Issue — recommended fix

### 🟢 Nice to have
- ...

## Test plan
- [ ] Specific steps to verify the change
```

Lead with the highest-severity findings. If the change looks good, say so briefly and list what was checked.

Do not request changes for pre-existing issues outside the diff unless they are 🔴 Critical and introduced by the change's blast radius.

See [engineering-standards](../engineering-standards/SKILL.md) and [security-review](../security-review/SKILL.md) for deeper standards.
