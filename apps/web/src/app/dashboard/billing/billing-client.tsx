"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { PLANS, normalizePlan, type Plan } from "@/lib/plans";

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
  instructions,
  requests: initialRequests,
}: BillingClientProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [method, setMethod] = useState<"upi" | "paypal" | "bank">("upi");
  const [referenceNote, setReferenceNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const plan = normalizePlan(initialPlan);
  const planConfig = PLANS[plan];
  const canUpgrade = plan === "free";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "pro", method, referenceNote }),
    });

    setLoading(false);

    if (response.ok) {
      setMessage("Payment request submitted. We'll activate Pro after verification.");
      setReferenceNote("");
      const data = await fetch("/api/billing").then((r) => r.json());
      setRequests(data.requests ?? []);
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "Could not submit payment request.");
    }
  }

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

      {canUpgrade && (
        <Card className="mt-8 max-w-xl border-accent/30 bg-accent/[0.06]">
          <CardHeader>
            <CardTitle className="font-display text-xl">Upgrade to Pro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold text-ink">
              {PLANS.pro.priceLabel}
            </p>
            <p className="mt-1 font-mono text-xs text-muted">
              {PLANS.pro.priceNote}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {PLANS.pro.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-accent">→</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              {canUpgrade ? "Submit payment for Pro" : "Plan management"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canUpgrade ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-md bg-background p-3 text-sm">
                  <p className="font-medium text-ink">
                    {PLANS.pro.name} — {PLANS.pro.priceLabel}
                  </p>
                  <p className="mt-1 text-muted">{PLANS.pro.priceNote}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-ink">Payment method</Label>
                  <select
                    className="field-select"
                    value={method}
                    onChange={(e) =>
                      setMethod(e.target.value as "upi" | "paypal" | "bank")
                    }
                  >
                    <option value="upi">UPI</option>
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank transfer</option>
                  </select>
                </div>
                <div className="rounded-md bg-background p-3 text-sm">
                  <p className="font-medium text-ink">Payment details</p>
                  <p className="mt-1 text-muted">UPI: {instructions.upi}</p>
                  <p className="text-muted">PayPal: {instructions.paypal}</p>
                  <p className="text-muted">Bank: {instructions.bank}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-ink">Reference note</Label>
                  <Input
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    placeholder="Transaction ID or payment note"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  variant="accent"
                >
                  {loading ? "Submitting..." : "Submit payment proof"}
                </Button>
                {message && (
                  <Alert
                    variant={message.includes("submitted") ? "success" : "error"}
                  >
                    {message}
                  </Alert>
                )}
              </form>
            ) : (
              <p className="text-sm text-muted">
                You&apos;re on {planConfig.name}. Enterprise with dedicated
                infrastructure is coming soon — contact support if you need
                higher limits today.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-muted">No payment requests yet.</p>
            ) : (
              <ul className="space-y-3">
                {requests.map((req, i) => (
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

      {!canUpgrade && (
        <p className="mt-6 text-sm text-muted">
          Need more than {planConfig.maxApps} apps? Enterprise tier is coming
          soon with dedicated resources and custom limits.
        </p>
      )}
    </div>
  );
}
