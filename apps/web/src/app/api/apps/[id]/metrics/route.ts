import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { requireApiUser } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;

  const [app] = await db
    .select({ dokployAppId: apps.dokployAppId })
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, authResult.user.id)))
    .limit(1);

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    const dokploy = getDokployClient();
    const remote = await dokploy.getApplication(app.dokployAppId);
    const appName = remote.appName ?? remote.name;
    const metrics = await dokploy.getAppMonitoring(appName);
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Metrics error:", error);
    return NextResponse.json({ metrics: null });
  }
}
