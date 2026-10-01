import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { requireApiAdmin } from "@/lib/api-auth";
import { getDokployClient } from "@/lib/dokploy";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { toClientError } from "@/lib/safe-error";

const controlSchema = z.object({
  action: z.literal("stop"),
  reason: z.string().trim().max(200).optional(),
});

/** Admin-only stop (abuse, runaway resource use). Start stays with the owner. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = controlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const [app] = await db.select().from(apps).where(eq(apps.id, id)).limit(1);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    await getDokployClient().stopApplication(app.dokployAppId);
    await db
      .update(apps)
      .set({ status: "stopped", updatedAt: new Date() })
      .where(eq(apps.id, app.id));

    recordAuditEvent({
      userId: app.userId,
      appId: app.id,
      action: AUDIT_ACTIONS.adminAppStop,
      request,
      metadata: {
        actorId: authResult.user.id,
        ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin] stop app error:", error);
    return NextResponse.json(
      { error: toClientError(error, "Failed to stop application") },
      { status: 500 }
    );
  }
}
