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
    ramMb: 512,
    cpuLimit: 1,
    customDomain: false,
    description:
      "Try HostingIt with one deployable app (one container) on a shared subdomain.",
    features: [
      "1 app (one container)",
      "512 MB RAM per app",
      "1 vCPU per app",
      "Free fhusr-* subdomain + SSL",
      "GitHub deploys",
      "Community support",
    ],
  },
  /**
   * Paid plans are not on sale yet. Their details stay internal (admins can
   * still assign them) and the UI only shows a "Pro plan · Upcoming" banner.
   * Pro must never be below Free.
   */
  pro: {
    name: "Pro",
    price: null,
    priceLabel: "Upcoming",
    maxApps: 5,
    ramMb: 1024,
    cpuLimit: 2,
    customDomain: true,
    description: "Upcoming paid plan.",
    features: [],
    comingSoon: true,
  },
  enterprise: {
    name: "Enterprise",
    price: null,
    priceLabel: "Upcoming",
    maxApps: 0,
    ramMb: 0,
    cpuLimit: 0,
    customDomain: true,
    description: "Upcoming paid plan.",
    features: [],
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

export type HostingIdentity = {
  role: string;
  email: string;
  plan: string;
};

/** Unlimited app count only for ADMIN_EMAIL with role admin. Never trust the client. */
export function isUnlimitedHosting(user: {
  role: string;
  email: string;
}): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return false;
  return (
    user.role === "admin" && user.email.trim().toLowerCase() === adminEmail
  );
}

/** `null` means no cap. */
export function getEffectiveAppLimit(user: HostingIdentity): number | null {
  if (isUnlimitedHosting(user)) return null;
  return getPlanLimit(user.plan);
}

export function formatAppQuota(
  count: number,
  limit: number | null
): string {
  return limit === null ? `${count}/∞` : `${count}/${limit}`;
}

export function canCreateApp(count: number, limit: number | null): boolean {
  return limit === null || count < limit;
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
