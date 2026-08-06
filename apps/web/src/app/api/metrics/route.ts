import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userApps = await db
    .select({
      id: apps.id,
      name: apps.name,
      slug: apps.slug,
      status: apps.status,
      dokployAppId: apps.dokployAppId,
    })
    .from(apps)
    .where(eq(apps.userId, session.user.id));

  const dokploy = getDokployClient();

  const results = await Promise.all(
    userApps.map(async (app) => {
      try {
        const remote = await dokploy.getApplication(app.dokployAppId);
        const appName = remote.appName ?? remote.name;
        const metrics = await dokploy.getAppMonitoring(appName);
        return {
          id: app.id,
          name: app.name,
          slug: app.slug,
          status: app.status,
          metrics,
        };
      } catch {
        return {
          id: app.id,
          name: app.name,
          slug: app.slug,
          status: app.status,
          metrics: null,
        };
      }
    })
  );

  return NextResponse.json({ apps: results });
}
