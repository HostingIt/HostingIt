import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { applyPlanResourceLimits } from "@/lib/app-resources";
import { ensureStaticDomainPort } from "@/lib/dokploy-domain";
import { syncDokployGitSource } from "@/lib/deploy-git";
import { toClientError } from "@/lib/safe-error";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";

const buildTypes = [
  "nixpacks",
  "dockerfile",
  "static",
  "heroku_buildpacks",
  "paketo_buildpacks",
  "railpack",
] as const;

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
      githubBranch: app.githubBranch,
      githubOwner: app.githubOwner,
      githubRepo: app.githubRepo,
      buildPath: remote.customGitBuildPath ?? remote.buildPath ?? "/",
      buildType: remote.buildType ?? "nixpacks",
      autoDeploy: remote.autoDeploy ?? true,
      dockerfile: remote.dockerfile ?? "Dockerfile",
      dockerContextPath: remote.dockerContextPath ?? ".",
      dockerBuildStage: remote.dockerBuildStage ?? "",
      publishDirectory: remote.publishDirectory ?? "dist",
      isStaticSpa: remote.isStaticSpa ?? false,
      applicationStatus: remote.applicationStatus ?? app.status,
    });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch app settings" },
      { status: 500 }
    );
  }
}

const updateSettingsSchema = z.object({
  githubBranch: z.string().min(1).max(256).optional(),
  buildPath: z.string().max(256).optional(),
  buildType: z.enum(buildTypes).optional(),
  autoDeploy: z.boolean().optional(),
  dockerfile: z.string().max(256).optional(),
  dockerContextPath: z.string().max(256).optional(),
  dockerBuildStage: z.string().max(256).optional(),
  publishDirectory: z.string().max(256).optional(),
  isStaticSpa: z.boolean().optional(),
  redeploy: z.boolean().optional(),
});

export async function PATCH(
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
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const dokploy = getDokployClient();

  try {
    const branch = data.githubBranch ?? app.githubBranch;
    const buildPath = data.buildPath ?? "/";

    if (
      data.githubBranch !== undefined ||
      data.buildPath !== undefined ||
      data.redeploy
    ) {
      const [owner] = await db
        .select({ installationId: users.githubInstallationId })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (!owner?.installationId) {
        return NextResponse.json(
          {
            error:
              "GitHub App is not installed. Install it from Settings to update source settings.",
          },
          { status: 403 }
        );
      }

      await syncDokployGitSource({
        dokployAppId: app.dokployAppId,
        installationId: owner.installationId,
        owner: app.githubOwner,
        repo: app.githubRepo,
        branch,
        buildPath,
      });

      if (data.githubBranch !== undefined) {
        await db
          .update(apps)
          .set({ githubBranch: branch, updatedAt: new Date() })
          .where(eq(apps.id, app.id));
      }
    }

    if (data.autoDeploy !== undefined) {
      await dokploy.updateApplication({
        applicationId: app.dokployAppId,
        autoDeploy: data.autoDeploy,
      });
    }

    if (data.buildType !== undefined) {
      await dokploy.saveBuildType({
        applicationId: app.dokployAppId,
        buildType: data.buildType,
        dockerfile: data.dockerfile ?? "Dockerfile",
        dockerContextPath: data.dockerContextPath ?? ".",
        dockerBuildStage: data.dockerBuildStage || null,
        publishDirectory: data.publishDirectory ?? "dist",
        isStaticSpa: data.isStaticSpa ?? false,
      });
    }

    if (data.redeploy) {
      const buildType =
        data.buildType ??
        (await dokploy.getApplication(app.dokployAppId)).buildType;
      await ensureStaticDomainPort(dokploy, app, buildType);
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

    recordAuditEvent({
      userId: session.user.id,
      appId: app.id,
      action: AUDIT_ACTIONS.appSettingsUpdate,
      request,
      metadata: {
        fields: Object.keys(data),
        branch: data.githubBranch,
        buildType: data.buildType,
        redeploy: data.redeploy === true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      {
        error:
          toClientError(error, "Failed to update settings"),
      },
      { status: 500 }
    );
  }
}
