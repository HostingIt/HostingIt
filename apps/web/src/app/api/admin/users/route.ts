import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db.select().from(users);
  return NextResponse.json({ users: allUsers });
}

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  accountStatus: z.enum(["pending", "active", "suspended"]).optional(),
  plan: z.enum(["free", "starter", "pro", "business"]).optional(),
});

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { userId, accountStatus, plan } = parsed.data;

  await db
    .update(users)
    .set({
      ...(accountStatus && { accountStatus }),
      ...(plan && { plan }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
