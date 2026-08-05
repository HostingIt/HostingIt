export type Plan = "free" | "starter" | "pro" | "business";

export interface PlanConfig {
  name: string;
  price: number | null;
  priceLabel: string;
  maxApps: number;
  customDomain: boolean;
  description: string;
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    priceLabel: "$0",
    maxApps: 1,
    customDomain: false,
    description: "1 app, shared resources, subdomain only",
  },
  starter: {
    name: "Starter",
    price: 5,
    priceLabel: "$5/mo",
    maxApps: 3,
    customDomain: true,
    description: "3 apps, custom domains, email support",
  },
  pro: {
    name: "Pro",
    price: 10,
    priceLabel: "$10/mo",
    maxApps: 10,
    customDomain: true,
    description: "10 apps, custom domains, priority support",
  },
  business: {
    name: "Business",
    price: null,
    priceLabel: "Custom",
    maxApps: 100,
    customDomain: true,
    description: "Custom limits and SLA — contact us",
  },
};

export function getPlanLimit(plan: Plan): number {
  return PLANS[plan].maxApps;
}

export function canUseCustomDomain(plan: Plan): boolean {
  return PLANS[plan].customDomain;
}
