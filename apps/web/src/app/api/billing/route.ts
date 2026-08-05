import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { paymentRequests, users } from "@/db/schema";
import { PLANS, type Plan } from "@/lib/plans";

const paymentSchema = z.object({
  plan: z.enum(["starter", "pro", "business"]),
  method: z.enum(["upi", "paypal", "bank"]),
  referenceNote: z.string().min(3),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const requests = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.userId, session.user.id));

  return NextResponse.json({
    plan: user?.plan ?? "free",
    accountStatus: user?.accountStatus ?? "active",
    paymentInstructions: {
      upi: process.env.PAYMENT_UPI_ID ?? "Not configured",
      paypal: process.env.PAYMENT_PAYPAL ?? "Not configured",
      bank: process.env.PAYMENT_BANK_DETAILS ?? "Not configured",
    },
    requests,
    plans: PLANS,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { plan, method, referenceNote } = parsed.data;
    const planConfig = PLANS[plan as Plan];
    const amount = planConfig.price ?? 0;

    const [request_] = await db
      .insert(paymentRequests)
      .values({
        userId: session.user.id,
        plan,
        amount: amount.toFixed(2),
        method,
        referenceNote,
      })
      .returning();

    return NextResponse.json({ request: request_ });
  } catch (error) {
    console.error("Payment request error:", error);
    return NextResponse.json(
      { error: "Failed to submit payment request" },
      { status: 500 }
    );
  }
}
