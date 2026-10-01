import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { PAYMENTS_ENABLED, PLANS } from "@/lib/plans";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { requireApiUser } from "@/lib/api-auth";

const paymentSchema = z.object({
  plan: z.enum(["pro"]),
  method: z.enum(["upi", "paypal", "bank"]),
  referenceNote: z.string().trim().min(3).max(500),
});

export async function GET() {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const requests = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.userId, authResult.user.id));

  return NextResponse.json({
    plan: authResult.user.plan,
    paymentInstructions: {
      upi: process.env.PAYMENT_UPI_ID ?? "Not configured",
      paypal: process.env.PAYMENT_PAYPAL ?? "Not configured",
      bank: process.env.PAYMENT_BANK_DETAILS ?? "Not configured",
    },
    requests,
  });
}

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  if (!PAYMENTS_ENABLED) {
    return NextResponse.json(
      { error: "Paid plans are coming soon. Stick with Free for now." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { method, referenceNote } = parsed.data;
    const amount = PLANS.pro.price ?? 0;

    const [request_] = await db
      .insert(paymentRequests)
      .values({
        userId: authResult.user.id,
        plan: "pro",
        amount: amount.toFixed(2),
        method,
        referenceNote,
      })
      .returning();

    recordAuditEvent({
      userId: authResult.user.id,
      action: AUDIT_ACTIONS.billingRequest,
      request,
      metadata: { plan: "pro", method },
    });

    return NextResponse.json({ request: request_ });
  } catch (error) {
    console.error("Payment request error:", error);
    return NextResponse.json(
      { error: "Failed to submit payment request" },
      { status: 500 }
    );
  }
}
