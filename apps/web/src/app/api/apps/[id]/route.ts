import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient, getAppUrl } from "@/lib/dokploy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
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
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  let logs = "";
  try {
    const dokploy = getDokployClient();
    logs = await dokploy.getApplicationLogs(app.dokployAppId);
  } catch {
    logs = "Unable to fetch logs. Check Dokploy configuration.";
  }

  return NextResponse.json({
    app,
    url: getAppUrl(app.slug),
    logs,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
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
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    const dokploy = getDokployClient();
    if (app.dokployDomainId) {
      await dokploy.deleteDomain(app.dokployDomainId);
    }
    await dokploy.deleteApplication(app.dokployAppId);
  } catch (error) {
    console.error("Dokploy delete error:", error);
  }

  await db.delete(apps).where(eq(apps.id, app.id));

  return NextResponse.json({ success: true });
}
