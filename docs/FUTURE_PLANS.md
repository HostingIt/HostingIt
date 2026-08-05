# HostingIt — Future Plans

This document outlines upcoming infrastructure and product directions. Timelines are approximate and will evolve as we scale.

---

## Overview

HostingIt is growing from a single-node MVP into a **multi-surface hosting platform**:

| Surface | Who it's for | Status |
|---------|--------------|--------|
| **HostingIt Cloud** | Indie devs, hobby projects, small apps | Live (MVP) |
| **HostingIt Infra** | Paid tiers on team-managed infrastructure | Planned — scaling soon |
| **HostingIt Self-Hosted** | Users who want to run apps on their own hardware | Planned |

Customers always interact through the **HostingIt control panel**. They never manage raw servers or internal tooling directly.

---

## HostingIt Infra

**HostingIt Infra** is our team-operated infrastructure layer — the backbone we are scaling to run customer workloads reliably beyond free-tier limits.

### Goals

- Dedicated capacity for Starter, Pro, and Business plans
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
                    └──┬────────┬─────┬───┘
                       │        │     │
              ┌────────▼──┐ ┌───▼───┐ ┌▼────────────┐
              │ Free tier │ │ Infra │ │ Self-hosted │
              │   node    │ │ nodes │ │   agents    │
              └───────────┘ └───────┘ └─────────────┘
```

### Rollout phases

1. **Phase 1 — Multi-node Infra**  
   Multiple team-managed hosts; free vs paid routing.

2. **Phase 2 — Central routing**  
   Single domain front door; DB maps each app to its host.

3. **Phase 3 — Regions**  
   EU / US / APAC Infra nodes; user or plan-based region selection.

4. **Phase 4 — Self-hosted agents**  
   Optional “bring your own server” tier via HostingIt Agent.

---

## Self-hosted (bring your own server)

For developers who want HostingIt’s panel and workflow on **their own machine** — homelab, office server, or private VPS.

### Planned flow

1. User installs **HostingIt Agent** on their device (Docker required).
2. Agent registers with the control plane via a pairing code.
3. Outbound-only connection (no open SSH from the internet).
4. Deploy from the same dashboard; app runs locally on their hardware.
5. Optional: custom domain or tunnel URL for access.

### Use cases

- Local development with production-like deploys
- Internal tools on private networks
- Full data sovereignty
- Teams with existing hardware they want to utilize

### Limitations (expected)

- User responsible for hardware uptime and bandwidth
- No SLA from HostingIt on self-hosted availability
- May require tunnel or DNS setup for public URLs

---

## Control plane improvements (cross-cutting)

- In-dashboard environment variables
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
- **Best-effort honesty** — clear limits for hobby vs Infra vs self-hosted tiers

---

## Contributing / feedback

We're actively building Infra scaling and self-hosted support. If you're on a paid plan or want early access to Self-Hosted beta, contact the team through the dashboard or support email.
