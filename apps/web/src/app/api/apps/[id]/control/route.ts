import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";

const controlSchema = z.object({
  action: z.enum(["start", "stop", "restart", "cancel"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [app] = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, session.user.id)))
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Control error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : `Failed to ${action} application`,
      },
      { status: 500 }
    );
  }
}
