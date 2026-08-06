# HostingIt — Future Plans

This document outlines upcoming infrastructure and product directions. Timelines are approximate and will evolve as we scale.

---

## Overview

HostingIt is growing from a single-node MVP into a stronger managed hosting platform:

| Surface | Who it's for | Status |
|---------|--------------|--------|
| **HostingIt Cloud** | Indie devs, hobby projects, small apps | Live (MVP) |
| **HostingIt Infra** | Paid tiers on team-managed infrastructure | Planned — scaling soon |

Customers always interact through the **HostingIt control panel**. They never manage raw servers or internal tooling directly.

---

## HostingIt Infra

**HostingIt Infra** is our team-operated infrastructure layer — the backbone we are scaling to run customer workloads reliably beyond free-tier limits.

### Goals

- Dedicated capacity for Pro and Enterprise plans
- Multi-region and multi-provider nodes (cloud VPS, bare metal as needed)
- Better isolation and performance than shared free-tier resources
- Central routing, SSL, and monitoring managed by the HostingIt team

### Planned capabilities

- Automatic host selection by plan, region, and load
- Health checks and failover between nodes
- Usage metrics and fair resource limits per plan
- Migration path for free-tier apps upgrading to paid Infra

### Operator notes (internal)

- Host registry and scheduler in the control plane
- Per-host deploy credentials (encrypted at rest)
- Central reverse proxy mapping `*.hostingit.online` → correct node
- Infra nodes registered and drained via admin tools

---

## Multi-setup architecture

Today all apps provision on a single deploy backend. The target architecture:

```
                    ┌─────────────────────┐
                    │  HostingIt Panel    │
                    │  (control plane)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Host scheduler    │
                    │   (plan + region)   │
                    └──┬─────────────┬────┘
                       │             │
              ┌────────▼──┐     ┌────▼────┐
              │ Free tier │     │ Infra   │
              │   node    │     │ nodes   │
              └───────────┘     └─────────┘
```

### Rollout phases

1. **Phase 1 — Multi-node Infra**  
   Multiple team-managed hosts; free vs paid routing.

2. **Phase 2 — Central routing**  
   Single domain front door; DB maps each app to its host.

3. **Phase 3 — Regions**  
   EU / US / APAC Infra nodes; user or plan-based region selection.

---

## Control plane improvements (cross-cutting)

- Richer project grouping for multi-container products
- Deploy webhooks and CI integration
- Automated billing (Stripe / Razorpay)
- Uptime monitoring and auto-restart
- Backup and restore
- Team / organization accounts
- Audit logs for admin and compliance

---

## What stays the same

- **One panel** — GitHub/Google sign-in, 2FA, deploy wizard, billing
- **No customer access** to internal deploy backends or server admin UIs
- **Best-effort honesty** — clear limits for hobby vs Infra tiers

---

## Contributing / feedback

We're actively building Infra scaling. If you're on a paid plan or want early access, contact the team through the dashboard or support email.
