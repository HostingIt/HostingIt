import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { apps, deployments } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";

export async function POST(
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
    await dokploy.redeploy(app.dokployAppId);

    await db
      .update(apps)
      .set({ status: "deploying", updatedAt: new Date() })
      .where(eq(apps.id, app.id));

    await db.insert(deployments).values({
      appId: app.id,
      status: "running",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Redeploy error:", error);
    return NextResponse.json(
      { error: "Failed to redeploy application" },
      { status: 500 }
    );
  }
}
