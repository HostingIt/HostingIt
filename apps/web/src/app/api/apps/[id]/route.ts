import { NextResponse } from "next/server";
import { eq, and, count } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getAppPublicUrl } from "@/lib/dokploy";
import { deleteAppFromDokploy } from "@/lib/dokploy-app-delete";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";

export async function GET(
  _request: Request,
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
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return NextResponse.json({
    app,
    url: getAppPublicUrl(app),
  });
}

export async function DELETE(
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
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const [{ value: userAppCount }] = await db
    .select({ value: count() })
    .from(apps)
    .where(eq(apps.userId, session.user.id));

  await deleteAppFromDokploy(app, userAppCount);

  await db.delete(apps).where(eq(apps.id, app.id));

  recordAuditEvent({
    userId: session.user.id,
    action: AUDIT_ACTIONS.appDelete,
    request,
    metadata: { name: app.name, slug: app.slug },
  });

  return NextResponse.json({ success: true });
}
