"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PAYMENTS_ENABLED, PLANS, normalizePlan, type Plan } from "@/lib/plans";

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
  const proComingSoon = PLANS.pro.comingSoon || !PAYMENTS_ENABLED;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Billing"
        description={
          <>
            Current plan: <strong className="text-ink">{planConfig.name}</strong>
            {planConfig.maxApps > 0 && (
              <>
                {" "}
                · up to {planConfig.maxApps} apps · {planConfig.ramMb} MB RAM/app
              </>
            )}
            {" · "}
            <Link href="/pricing" className="text-accent hover:underline">
              Compare plans
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Your plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-background p-4">
              <p className="font-display text-2xl font-bold text-ink">
                {planConfig.name}
              </p>
              <p className="mt-1 text-sm text-muted">{planConfig.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {planConfig.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-accent">→</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {plan === "free" && proComingSoon && (
              <div className="rounded-md border border-border bg-surface p-4">
                <p className="font-medium text-ink">Pro — coming soon</p>
                <p className="mt-1 text-sm text-muted">
                  Paid upgrades and payment verification are not open yet. Free
                  stays available; we&apos;ll announce Pro when billing is ready.
                </p>
                <Button className="mt-4" variant="outline" disabled>
                  Coming soon
                </Button>
              </div>
            )}

            {plan !== "free" && (
              <p className="text-sm text-muted">
                You&apos;re on {planConfig.name}. Need changes? Contact support
                from the dashboard.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            {initialRequests.length === 0 ? (
              <p className="text-sm text-muted">
                {proComingSoon
                  ? "No payments yet — upgrades are coming soon."
                  : "No payment requests yet."}
              </p>
            ) : (
              <ul className="space-y-3">
                {initialRequests.map((req, i) => (
                  <li
                    key={req.id}
                    className="animate-fade-up flex items-center justify-between border border-border bg-surface p-3"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div>
                      <p className="font-medium capitalize text-ink">
                        {normalizePlan(req.plan)}
                      </p>
                      <p className="text-sm text-muted">
                        ${req.amount} via {req.method}
                      </p>
                    </div>
                    <Badge status={req.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
