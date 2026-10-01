"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export interface AdminPaymentRow {
  id: string;
  userId: string;
  userEmail: string;
  plan: string;
  amount: string;
  method: string;
  referenceNote: string;
  status: string;
  adminNotes: string | null;
  createdAgo: string;
}

export function PaymentsList({ payments }: { payments: AdminPaymentRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<{
    payment: AdminPaymentRow;
    action: "approve" | "reject";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function review() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: pending.payment.id, action: pending.action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Review failed");
        return;
      }
      setPending(null);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (payments.length === 0) {
    return (
      <Card className="border-dashed border-border bg-surface/50">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <ReceiptText className="h-8 w-8 text-muted" aria-hidden />
          <p className="mt-3 text-sm text-muted">No payment requests.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Card className="card-elevated overflow-hidden border-border">
        <ul className="divide-y divide-border">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/users?user=${p.userId}`}
                    className="truncate font-medium text-ink hover:underline"
                  >
                    {p.userEmail}
                  </Link>
                  <Badge status={p.status} />
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  <span className="capitalize">{p.plan}</span> · ${p.amount} via{" "}
                  <span className="uppercase">{p.method}</span> · {p.createdAgo}
                </p>
                <p className="mt-1 break-words font-mono text-xs text-ink/80">
                  Ref: {p.referenceNote}
                </p>
                {p.adminNotes && (
                  <p className="mt-1 text-xs text-muted">Note: {p.adminNotes}</p>
                )}
              </div>
              {p.status === "pending" && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => setPending({ payment: p, action: "approve" })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPending({ payment: p, action: "reject" })}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmModal
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.action === "approve"
            ? `Approve ${pending.payment.userEmail}?`
            : `Reject ${pending?.payment.userEmail ?? "payment"}?`
        }
        description={
          pending?.action === "approve"
            ? `Moves them to ${pending.payment.plan} and restarts their running apps with the new limits. Only approve once the payment has arrived.`
            : "The request is marked rejected. Their plan does not change."
        }
        confirmLabel={pending?.action === "approve" ? "Approve" : "Reject"}
        variant={pending?.action === "approve" ? "accent" : "destructive"}
        busy={busy}
        onConfirm={review}
      />
    </div>
  );
}
