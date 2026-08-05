"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Payment {
  payment: {
    id: string;
    plan: string;
    amount: string;
    method: string;
    referenceNote: string;
    status: string;
    createdAt: string;
  };
  userEmail: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    fetch("/api/admin/payments")
      .then((res) => res.json())
      .then((data) => setPayments(data.payments ?? []));
  }, []);

  async function handleAction(
    paymentId: string,
    action: "approve" | "reject"
  ) {
    await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, action }),
    });
    const data = await fetch("/api/admin/payments").then((r) => r.json());
    setPayments(data.payments ?? []);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Payments</h1>
      <p className="mt-1 text-zinc-600">Review and approve payment requests</p>

      <div className="mt-8 space-y-4">
        {payments.length === 0 ? (
          <p className="text-zinc-500">No payment requests.</p>
        ) : (
          payments.map(({ payment, userEmail }) => (
            <Card key={payment.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{userEmail}</p>
                    <p className="text-sm text-zinc-500">
                      {payment.plan} · ${payment.amount} via {payment.method}
                    </p>
                    <p className="mt-1 text-sm">{payment.referenceNote}</p>
                    <div className="mt-2">
                      <Badge status={payment.status} />
                    </div>
                  </div>
                  {payment.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(payment.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(payment.id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
