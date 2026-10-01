import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, paymentRequests } from "@/db/schema";
import { requireApiAdmin } from "@/lib/api-auth";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { enforceLimitsOnApps, listAdminAppTargets } from "@/lib/admin";

export async function GET() {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

  const payments = await db
    .select({
      payment: paymentRequests,
      userEmail: users.email,
    })
    .from(paymentRequests)
    .innerJoin(users, eq(paymentRequests.userId, users.id))
    .orderBy(desc(paymentRequests.createdAt));

  return NextResponse.json({ payments });
}

const paymentActionSchema = z.object({
  paymentId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;
  const admin = authResult.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = paymentActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { paymentId, action, adminNotes } = parsed.data;

  const [payment] = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.id, paymentId))
    .limit(1);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status !== "pending") {
    return NextResponse.json(
      { error: `Payment was already ${payment.status}` },
      { status: 409 }
    );
  }

  if (action === "approve") {
    await db
      .update(paymentRequests)
      .set({ status: "approved", adminNotes, updatedAt: new Date() })
      .where(eq(paymentRequests.id, paymentId));

    await db
      .update(users)
      .set({
        plan: payment.plan,
        accountStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, payment.userId));
  } else {
    await db
      .update(paymentRequests)
      .set({ status: "rejected", adminNotes, updatedAt: new Date() })
      .where(eq(paymentRequests.id, paymentId));
  }

  recordAuditEvent({
    userId: payment.userId,
    action: AUDIT_ACTIONS.adminPaymentReview,
    request,
    metadata: {
      plan: payment.plan,
      result: action === "approve" ? "approved" : "rejected",
      actorId: admin.id,
    },
  });

  if (action === "approve") {
    const targets = await listAdminAppTargets({ userId: payment.userId });
    if (targets.length > 0) {
      await enforceLimitsOnApps(targets, { actorId: admin.id, request }).catch(
        (error) => console.error("[admin] payment limit sync failed:", error)
      );
    }
  }

  return NextResponse.json({ success: true });
}
