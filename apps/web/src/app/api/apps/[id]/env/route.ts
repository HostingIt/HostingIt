import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { applyPlanResourceLimits } from "@/lib/app-resources";
import { parseEnvString, serializeEnvVars } from "@/lib/env-vars";
import { envVarListSchema } from "@/lib/env-var-schema";
import { toClientError } from "@/lib/safe-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const app = await getOwnedApp(session.user.id, id);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    const dokploy = getDokployClient();
    const remote = await dokploy.getApplication(app.dokployAppId);

    return NextResponse.json({
      env: parseEnvString(remote.env).map((row) => ({ ...row, secret: false })),
      buildArgs: parseEnvString(remote.buildArgs),
      buildSecrets: parseEnvString(remote.buildSecrets).map((row) => ({
        ...row,
        secret: true,
      })),
    });
  } catch (error) {
    console.error("Fetch env error:", error);
    return NextResponse.json(
      { error: "Failed to fetch environment variables" },
      { status: 500 }
    );
  }
}

const updateEnvSchema = z.object({
  env: envVarListSchema,
  buildArgs: envVarListSchema.optional(),
  buildSecrets: envVarListSchema.optional(),
  redeploy: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const app = await getOwnedApp(session.user.id, id);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateEnvSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const dokploy = getDokployClient();
    await dokploy.saveEnvironment({
      applicationId: app.dokployAppId,
      env: serializeEnvVars(parsed.data.env) || null,
      buildArgs: parsed.data.buildArgs
        ? serializeEnvVars(parsed.data.buildArgs) || null
        : null,
      buildSecrets: parsed.data.buildSecrets
        ? serializeEnvVars(parsed.data.buildSecrets) || null
        : null,
      createEnvFile: true,
    });

    if (parsed.data.redeploy) {
      await applyPlanResourceLimits(
        dokploy,
        app.dokployAppId,
        session.user.plan ?? "free"
      );
      await dokploy.redeploy(app.dokployAppId);
      await db
        .update(apps)
        .set({ status: "deploying", updatedAt: new Date() })
        .where(eq(apps.id, app.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save env error:", error);
    return NextResponse.json(
      {
        error:
          toClientError(error, "Failed to save environment variables"),
      },
      { status: 500 }
    );
  }
}
