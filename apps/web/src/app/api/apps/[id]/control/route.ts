import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { toClientError } from "@/lib/safe-error";
import { AUDIT_ACTIONS, recordAuditEvent, type AuditAction } from "@/lib/audit";
import { requireApiUser } from "@/lib/api-auth";

const controlSchema = z.object({
  action: z.enum(["start", "stop", "restart", "cancel"]),
});

const CONTROL_AUDIT: Record<"start" | "stop" | "restart" | "cancel", AuditAction> = {
  start: AUDIT_ACTIONS.appStart,
  stop: AUDIT_ACTIONS.appStop,
  restart: AUDIT_ACTIONS.appRestart,
  cancel: AUDIT_ACTIONS.appCancel,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;

  const [app] = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, authResult.user.id)))
    .limit(1);

  if (!app) {
    return NextResponse.json({ error: "App Unavailable" }, { status: 404 });
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

  const dokploy = getDokployClient();
  const { action } = parsed.data;

  try {
    switch (action) {
      case "start":
        await dokploy.startApplication(app.dokployAppId);
        await db
          .update(apps)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(apps.id, app.id));
        break;
      case "stop":
        await dokploy.stopApplication(app.dokployAppId);
        await db
          .update(apps)
          .set({ status: "stopped", updatedAt: new Date() })
          .where(eq(apps.id, app.id));
        break;
      case "restart":
        await dokploy.reload(app.dokployAppId);
        await db
          .update(apps)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(apps.id, app.id));
        break;
      case "cancel":
        await dokploy.cancelDeployment(app.dokployAppId);
        break;
    }

    recordAuditEvent({
      userId: authResult.user.id,
      appId: app.id,
      action: CONTROL_AUDIT[action],
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Control error:", error);
    return NextResponse.json(
      {
        error:
          toClientError(error, `Failed to ${action} application`),
      },
      { status: 500 }
    );
  }
}
