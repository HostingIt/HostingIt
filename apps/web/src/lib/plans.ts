export type Plan = "free" | "pro" | "enterprise";

export interface PlanConfig {
  name: string;
  price: number | null;
  priceLabel: string;
  priceNote?: string;
  maxApps: number;
  ramMb: number;
  /** Max vCPU cores per app (Docker cpuLimit) */
  cpuLimit: number;
  customDomain: boolean;
  description: string;
  features: string[];
  highlight?: boolean;
  comingSoon?: boolean;
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    priceLabel: "$0",
    priceNote: "forever",
    maxApps: 1,
    ramMb: 256,
    cpuLimit: 0.25,
    customDomain: false,
    description:
      "Try HostingIt with one deployable app (one container) on a shared subdomain.",
    features: [
      "1 app (one container)",
      "256 MB RAM per app",
      "0.25 vCPU per app",
      "Free fhusr-* subdomain + SSL",
      "GitHub deploys",
      "Community support",
    ],
  },
  pro: {
    name: "Pro",
    price: 10,
    priceLabel: "$10/mo",
    priceNote: "coming soon",
    maxApps: 5,
    ramMb: 512,
    cpuLimit: 0.5,
    customDomain: true,
    description: "Predictable pricing for indie devs shipping real side projects.",
    features: [
      "Up to 5 apps (ideal for FE + API)",
      "512 MB RAM per app",
      "0.5 vCPU per app",
      "Custom domains + SSL",
      "GitHub deploys",
      "Email support",
      "No usage overage surprises",
    ],
    comingSoon: true,
  },
  enterprise: {
    name: "Enterprise",
    price: null,
    priceLabel: "Coming soon",
    maxApps: 0,
    ramMb: 0,
    cpuLimit: 0,
    customDomain: true,
    description: "Dedicated capacity, SLA, and team options for production workloads.",
    features: [
      "Dedicated resources",
      "Custom app limits",
      "Priority support & SLA",
      "Team workspaces",
      "Invoice billing",
    ],
    comingSoon: true,
  },
};

/** Legacy DB values mapped until migrations run everywhere. */
export function normalizePlan(plan: string): Plan {
  if (plan === "starter") return "pro";
  if (plan === "business") return "enterprise";
  if (plan in PLANS) return plan as Plan;
  return "free";
}

export function getPlanLimit(plan: string): number {
  return PLANS[normalizePlan(plan)].maxApps;
}

export function canUseCustomDomain(plan: string): boolean {
  return PLANS[normalizePlan(plan)].customDomain;
}

export function getPlanConfig(plan: string): PlanConfig {
  return PLANS[normalizePlan(plan)];
}

/** Empty while paid upgrades are disabled (Pro shows as coming soon). */
export const PURCHASABLE_PLANS: Plan[] = [];

/** Flip to true when manual UPI/PayPal/bank upgrades should accept submissions again. */
export const PAYMENTS_ENABLED = false;

export interface ComparisonRow {
  label: string;
  hostingitFree: string;
  hostingitPro: string;
  railwayFree: string;
  railwayHobby: string;
}

export const RAILWAY_COMPARISON: ComparisonRow[] = [
  {
    label: "Monthly price",
    hostingitFree: "$0",
    hostingitPro: "$10 flat",
    railwayFree: "$0 (+ $1 usage credit)",
    railwayHobby: "$5 min (+ usage)",
  },
  {
    label: "Billing model",
    hostingitFree: "Flat — no meter",
    hostingitPro: "Flat — no meter",
    railwayFree: "Usage-based (RAM, CPU, egress)",
    railwayHobby: "Usage-based (RAM, CPU, egress)",
  },
  {
    label: "Apps / projects",
    hostingitFree: "1 app",
    hostingitPro: "5 apps",
    railwayFree: "1 project",
    railwayHobby: "Up to 50 projects",
  },
  {
    label: "RAM per service",
    hostingitFree: "256 MB (fixed)",
    hostingitPro: "512 MB (fixed)",
    railwayFree: "Up to 0.5 GB (metered)",
    railwayHobby: "Up to 48 GB (metered)",
  },
  {
    label: "Custom domains",
    hostingitFree: "Subdomain only",
    hostingitPro: "Yes",
    railwayFree: "Yes",
    railwayHobby: "Yes",
  },
  {
    label: "Surprise overage bills",
    hostingitFree: "None",
    hostingitPro: "None",
    railwayFree: "Possible if usage exceeds credit",
    railwayHobby: "Common if traffic spikes",
  },
  {
    label: "Best for",
    hostingitFree: "First deploy, learning",
    hostingitPro: "Side projects with fixed budget",
    railwayFree: "Tiny experiments",
    railwayHobby: "Variable workloads you can monitor",
  },
];

export const RAILWAY_PRICING_NOTE =
  "Railway Hobby starts at $5/mo but bills extra for RAM (~$10/GB), CPU (~$20/vCPU), and egress. Figures based on railway.com/pricing.";
