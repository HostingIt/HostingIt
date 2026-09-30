import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { users, paymentRequests } from "@/db/schema";

export async function GET() {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

  const payments = await db
    .select({
      payment: paymentRequests,
      userEmail: users.email,
    })
    .from(paymentRequests)
    .innerJoin(users, eq(paymentRequests.userId, users.id));

  return NextResponse.json({ payments });
}

const paymentActionSchema = z.object({
  paymentId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();
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

  return NextResponse.json({ success: true });
}
