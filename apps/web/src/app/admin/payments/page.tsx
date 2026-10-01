import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentRequests, users } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { PaymentsList, type AdminPaymentRow } from "@/components/admin/payments-list";
import { timeAgo } from "@/components/security/audit-meta";
import { PAYMENTS_ENABLED } from "@/lib/plans";

export default async function AdminPaymentsPage() {
  const rows = await db
    .select({ payment: paymentRequests, userEmail: users.email })
    .from(paymentRequests)
    .innerJoin(users, eq(paymentRequests.userId, users.id))
    .orderBy(desc(paymentRequests.createdAt));

  const payments: AdminPaymentRow[] = rows.map(({ payment, userEmail }) => ({
    id: payment.id,
    userId: payment.userId,
    userEmail,
    plan: payment.plan,
    amount: payment.amount,
    method: payment.method,
    referenceNote: payment.referenceNote,
    status: payment.status,
    adminNotes: payment.adminNotes,
    createdAgo: timeAgo(payment.createdAt),
  }));

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Payments"
        description="Manual upgrade requests (UPI, PayPal, bank). Approving switches the user's plan and applies its limits."
      />
      {!PAYMENTS_ENABLED && (
        <Alert variant="warning">
          Payments are switched off while Pro is upcoming. Users can&apos;t submit new
          requests; older ones still show here.
        </Alert>
      )}
      <PaymentsList payments={payments} />
    </div>
  );
}
