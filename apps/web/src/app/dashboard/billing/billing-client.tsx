"use client";

import Link from "next/link";
import { Boxes, Cpu, Globe, MemoryStick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProUpcomingBanner } from "@/components/billing/pro-upcoming-banner";
import { PLANS, normalizePlan, type Plan } from "@/lib/plans";
import { expectedLimits, formatCpu, formatMemory } from "@/lib/resource-limits";

interface PaymentRequest {
  id: string;
  plan: string;
  amount: string;
  method: string;
  referenceNote: string;
  status: string;
  createdAt: string;
}

interface BillingClientProps {
  plan: Plan;
  instructions: { upi: string; paypal: string; bank: string };
  requests: PaymentRequest[];
}

export function BillingClient({
  plan: initialPlan,
  requests: initialRequests,
}: BillingClientProps) {
  const plan = normalizePlan(initialPlan);
  const planConfig = PLANS[plan];
  const limits = expectedLimits(planConfig);

  const specs = [
    {
      label: "Apps",
      value: planConfig.maxApps > 0 ? String(planConfig.maxApps) : "Custom",
      icon: Boxes,
    },
    { label: "CPU per app", value: formatCpu(limits.nanoCpus), icon: Cpu },
    { label: "RAM per app", value: formatMemory(limits.memoryBytes), icon: MemoryStick },
    {
      label: "Domains",
      value: planConfig.customDomain ? "Custom + SSL" : "Subdomain + SSL",
      icon: Globe,
    },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        title="Billing"
        description={
          <>
            You&apos;re on the <strong className="text-ink">{planConfig.name}</strong>{" "}
            plan.{" "}
            <Link href="/docs/apps" className="text-accent hover:underline">
              How limits work
            </Link>
          </>
        }
      />

      <Card className="card-elevated border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Current plan
            </p>
            <CardTitle className="mt-1 font-display text-2xl">
              {planConfig.name}
            </CardTitle>
            {plan === "free" && (
              <p className="mt-1 text-sm text-muted">{planConfig.description}</p>
            )}
          </div>
          {plan === "free" && (
            <span className="shrink-0 font-display text-2xl font-bold text-ink">
              $0
            </span>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {specs.map((spec) => (
              <div
                key={spec.label}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3"
              >
                <spec.icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs text-muted">{spec.label}</dt>
                  <dd className="truncate text-sm font-medium text-ink">{spec.value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">
            Limits are enforced per running container. Builds run separately and
            are not counted.
          </p>
        </CardContent>
      </Card>

      {plan === "free" && <ProUpcomingBanner />}

      {initialRequests.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {initialRequests.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium capitalize text-ink">
                      {normalizePlan(req.plan)}
                    </p>
                    <p className="text-sm text-muted">
                      ${req.amount} via {req.method} ·{" "}
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge status={req.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
