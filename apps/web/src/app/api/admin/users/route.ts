import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireApiAdmin } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      accountStatus: users.accountStatus,
      role: users.role,
      githubId: users.githubId,
      googleId: users.googleId,
      githubInstallationId: users.githubInstallationId,
      totpEnabled: users.totpEnabled,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users);

  return NextResponse.json({ users: allUsers });
}

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  accountStatus: z.enum(["pending", "active", "suspended"]).optional(),
  plan: z.enum(["free", "pro", "enterprise"]).optional(),
});

export async function PATCH(request: Request) {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

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
