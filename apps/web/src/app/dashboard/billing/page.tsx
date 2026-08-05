"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, type Plan } from "@/lib/plans";

interface PaymentRequest {
  id: string;
  plan: string;
  amount: string;
  method: string;
  referenceNote: string;
  status: string;
  createdAt: string;
}

export default function BillingPage() {
  const [plan, setPlan] = useState<Plan>("free");
  const [instructions, setInstructions] = useState({
    upi: "",
    paypal: "",
    bank: "",
  });
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("starter");
  const [method, setMethod] = useState<"upi" | "paypal" | "bank">("upi");
  const [referenceNote, setReferenceNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/billing")
      .then((res) => res.json())
      .then((data) => {
        setPlan(data.plan);
        setInstructions(data.paymentInstructions);
        setRequests(data.requests ?? []);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan, method, referenceNote }),
    });

    setLoading(false);

    if (response.ok) {
      setMessage("Payment request submitted. We'll activate your plan after verification.");
      setReferenceNote("");
      const data = await fetch("/api/billing").then((r) => r.json());
      setRequests(data.requests ?? []);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Billing</h1>
      <p className="mt-1 text-zinc-600">
        Current plan: <strong className="capitalize">{plan}</strong>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upgrade plan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as Plan)}
                >
                  {(["starter", "pro"] as Plan[]).map((p) => (
                    <option key={p} value={p}>
                      {PLANS[p].name} — {PLANS[p].priceLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Payment method</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
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
              <div className="rounded-md bg-zinc-50 p-3 text-sm">
                <p className="font-medium">Payment details</p>
                <p className="mt-1">UPI: {instructions.upi}</p>
                <p>PayPal: {instructions.paypal}</p>
                <p>Bank: {instructions.bank}</p>
              </div>
              <div className="space-y-2">
                <Label>Reference note</Label>
                <Input
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="Transaction ID or payment note"
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit payment proof"}
              </Button>
              {message && (
                <p className="text-sm text-green-600">{message}</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-zinc-500">No payment requests yet.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-md border border-zinc-200 p-3"
                  >
                    <div>
                      <p className="font-medium capitalize">{req.plan}</p>
                      <p className="text-sm text-zinc-500">
                        ${req.amount} via {req.method}
                      </p>
                    </div>
                    <Badge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
