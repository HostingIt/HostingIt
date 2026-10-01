import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { requireApiAdmin } from "@/lib/api-auth";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import {
  enforceLimitsOnApps,
  isProtectedAccount,
  listAdminAppTargets,
  summarizeOutcomes,
} from "@/lib/admin";

export async function GET() {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

  const appCounts = db
    .select({ userId: apps.userId, value: count().as("app_count") })
    .from(apps)
    .groupBy(apps.userId)
    .as("app_counts");

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
      appCount: appCounts.value,
    })
    .from(users)
    .leftJoin(appCounts, eq(appCounts.userId, users.id));

  return NextResponse.json({
    users: allUsers.map((u) => ({ ...u, appCount: Number(u.appCount ?? 0) })),
  });
}

const updateUserSchema = z
  .object({
    userId: z.string().uuid(),
    accountStatus: z.enum(["pending", "active", "suspended"]).optional(),
    plan: z.enum(["free", "pro", "enterprise"]).optional(),
  })
  .refine((v) => v.accountStatus !== undefined || v.plan !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(request: Request) {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;
  const admin = authResult.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { userId, accountStatus, plan } = parsed.data;

  const [target] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      plan: users.plan,
      accountStatus: users.accountStatus,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (accountStatus && accountStatus !== "active") {
    if (target.id === admin.id) {
      return NextResponse.json(
        { error: "You cannot suspend your own account" },
        { status: 400 }
      );
    }
    if (isProtectedAccount(target)) {
      return NextResponse.json(
        { error: "The super admin account cannot be suspended" },
        { status: 400 }
      );
    }
  }

  const planChanged = plan !== undefined && plan !== target.plan;
  const statusChanged =
    accountStatus !== undefined && accountStatus !== target.accountStatus;

  if (!planChanged && !statusChanged) {
    return NextResponse.json({ success: true, unchanged: true });
  }

  await db
    .update(users)
    .set({
      ...(planChanged && { plan }),
      ...(statusChanged && { accountStatus }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  if (statusChanged) {
    recordAuditEvent({
      userId,
      action: AUDIT_ACTIONS.adminUserStatusChange,
      request,
      metadata: { from: target.accountStatus, to: accountStatus, actorId: admin.id },
    });
  }

  let limits: ReturnType<typeof summarizeOutcomes> | null = null;
  if (planChanged) {
    recordAuditEvent({
      userId,
      action: AUDIT_ACTIONS.adminUserPlanChange,
      request,
      metadata: { from: target.plan, to: plan, actorId: admin.id },
    });

    // New plan → new CPU/RAM caps; push them to the user's containers now.
    const targets = await listAdminAppTargets({ userId });
    if (targets.length > 0) {
      try {
        const results = await enforceLimitsOnApps(targets, {
          actorId: admin.id,
          request,
        });
        limits = summarizeOutcomes(results);
      } catch (error) {
        console.error("[admin] plan change limit sync failed:", error);
      }
    }
  }

  return NextResponse.json({ success: true, limits });
}
