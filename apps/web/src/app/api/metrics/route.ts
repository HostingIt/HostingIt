import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { requireApiUser } from "@/lib/api-auth";
import { getDokployClient } from "@/lib/dokploy";

const querySchema = z.object({
  appId: z.string().uuid().optional(),
});

async function metricsForApp(app: {
  id: string;
  name: string;
  slug: string;
  status: string;
  dokployAppId: string;
}) {
  try {
    const dokploy = getDokployClient();
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
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const parsed = querySchema.safeParse({
    appId: request.nextUrl.searchParams.get("appId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 }
    );
  }

  const { appId } = parsed.data;
  const owner = eq(apps.userId, authResult.user.id);

  if (appId) {
    const [app] = await db
      .select({
        id: apps.id,
        name: apps.name,
        slug: apps.slug,
        status: apps.status,
        dokployAppId: apps.dokployAppId,
      })
      .from(apps)
      .where(and(eq(apps.id, appId), owner))
      .limit(1);

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    return NextResponse.json({ apps: [await metricsForApp(app)] });
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
    .where(owner);

  const results = await Promise.all(userApps.map(metricsForApp));
  return NextResponse.json({ apps: results });
}
