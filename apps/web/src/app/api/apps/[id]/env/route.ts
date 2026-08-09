import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { applyPlanResourceLimits } from "@/lib/app-resources";
import { ensureStaticDomainPort } from "@/lib/dokploy-domain";
import { parseEnvString, serializeEnvVars } from "@/lib/env-vars";
import { envVarListSchema } from "@/lib/env-var-schema";
import { mergeEnvVarUpdates, toMaskedEnvResponse } from "@/lib/env-secrets";
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

    const env = parseEnvString(remote.env);
    const buildSecrets = parseEnvString(remote.buildSecrets);

    return NextResponse.json({
      env: toMaskedEnvResponse(env),
      buildArgs: parseEnvString(remote.buildArgs),
      buildSecrets: toMaskedEnvResponse(buildSecrets, { forceSecret: true }),
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
    const remote = await dokploy.getApplication(app.dokployAppId);
    const existingEnv = parseEnvString(remote.env);
    const existingBuildSecrets = parseEnvString(remote.buildSecrets);

    const env = mergeEnvVarUpdates(parsed.data.env, existingEnv);
    const buildSecrets = parsed.data.buildSecrets
      ? mergeEnvVarUpdates(parsed.data.buildSecrets, existingBuildSecrets)
      : undefined;

    await dokploy.saveEnvironment({
      applicationId: app.dokployAppId,
      env: serializeEnvVars(env) || null,
      buildArgs: parsed.data.buildArgs
        ? serializeEnvVars(parsed.data.buildArgs) || null
        : null,
      buildSecrets: buildSecrets
        ? serializeEnvVars(buildSecrets) || null
        : null,
      createEnvFile: true,
    });

    if (parsed.data.redeploy) {
      await ensureStaticDomainPort(dokploy, app, remote.buildType);
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
