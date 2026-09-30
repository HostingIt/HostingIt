import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { resolveAppStatus } from "@/lib/app-status";
import { requireApiUser } from "@/lib/api-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const app = await getOwnedApp(authResult.user.id, id);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    const dokploy = getDokployClient();
    const resolved = await resolveAppStatus(
      dokploy,
      app.dokployAppId,
      app.status
    );

    if (resolved !== app.status) {
      await db
        .update(apps)
        .set({ status: resolved, updatedAt: new Date() })
        .where(eq(apps.id, app.id));
      app.status = resolved;
    }

    return NextResponse.json({
      app: {
        id: app.id,
        name: app.name,
        slug: app.slug,
        status: app.status,
      },
    });
  } catch {
    return NextResponse.json({
      app: {
        id: app.id,
        name: app.name,
        slug: app.slug,
        status: app.status,
      },
    });
  }
}
