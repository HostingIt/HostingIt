import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { normalizePlan, type Plan } from "@/lib/plans";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const session = await requireAuth();

  const requests = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.userId, session.user.id));

  const plan = normalizePlan(session.user.plan ?? "free") as Plan;

  return (
    <BillingClient
      plan={plan}
      instructions={{
        upi: process.env.PAYMENT_UPI_ID ?? "Not configured",
        paypal: process.env.PAYMENT_PAYPAL ?? "Not configured",
        bank: process.env.PAYMENT_BANK_DETAILS ?? "Not configured",
      }}
      requests={requests.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
