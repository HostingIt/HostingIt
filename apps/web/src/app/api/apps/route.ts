import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, apps } from "@/db/schema";
import {
  getDokployClient,
  getAppPublicUrl,
} from "@/lib/dokploy";
import { serializeEnvVars } from "@/lib/env-vars";
import { envVarListSchema } from "@/lib/env-var-schema";
import { syncDokployGitSource } from "@/lib/deploy-git";
import { ensureUserDokployEnvironment } from "@/lib/dokploy-user";
import { applyPlanResourceLimits } from "@/lib/app-resources";
import {
  fetchDockerfileText,
} from "@/lib/dokploy-domain";
import { resolveContainerPort } from "@/lib/container-port";
import { toClientError } from "@/lib/safe-error";
import { InvalidAppSlugError, isValidAppNameForSlug } from "@/lib/utils";
import {
  AppPlanLimitError,
  cleanupDokployProvision,
  releaseAppSlot,
  reserveAppSlot,
  type DokployProvisionResources,
} from "@/lib/app-create-guard";
import { syncDeploymentsFromDokploy } from "@/lib/deployments";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { requireApiUser } from "@/lib/api-auth";

const createAppSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(63)
    .refine(isValidAppNameForSlug, {
      message:
        "App name must include at least one letter or number (a-z, 0-9)",
    }),
  githubOwner: z.string().min(1),
  githubRepo: z.string().min(1),
  githubBranch: z.string().min(1).default("main"),
  buildPath: z.string().max(256).default("/"),
  buildType: z
    .enum([
      "nixpacks",
      "dockerfile",
      "static",
      "heroku_buildpacks",
      "paketo_buildpacks",
      "railpack",
    ])
    .default("nixpacks"),
  dockerfile: z.string().max(256).optional(),
  dockerContextPath: z.string().max(256).optional(),
  dockerBuildStage: z.string().max(256).optional(),
  env: envVarListSchema.optional(),
  buildSecrets: envVarListSchema.optional(),
  buildArgs: envVarListSchema.optional(),
  deployImmediately: z.boolean().default(true),
});

export async function GET() {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const userApps = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, authResult.user.id));

  return NextResponse.json({ apps: userApps });
}

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  let reservedAppId: string | null = null;
  const dokployResources: DokployProvisionResources = {};

  try {
    const body = await request.json();
    const parsed = createAppSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const {
      name,
      githubOwner,
      githubRepo,
      githubBranch,
      buildPath,
      buildType,
      dockerfile,
      dockerContextPath,
      dockerBuildStage,
      env,
      buildSecrets,
      buildArgs,
      deployImmediately,
    } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, authResult.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.accountStatus !== "active") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    if (!user.githubInstallationId) {
      return NextResponse.json(
        {
          error:
            "Install the HostingIt GitHub App first so we can access your repositories.",
          code: "GITHUB_APP_REQUIRED",
        },
        { status: 403 }
      );
    }

    const dokploy = getDokployClient();
    const { projectId, environmentId } =
      await ensureUserDokployEnvironment(user);

    const { app: reservedApp, slug, subdomain } = await reserveAppSlot({
      userId: user.id,
      name,
      projectId,
      githubOwner,
      githubRepo,
      githubBranch,
    });
    reservedAppId = reservedApp.id;

    const application = await dokploy.createApplication({
      name,
      appName: slug,
      environmentId,
    });

    const applicationId =
      (application as { applicationId?: string }).applicationId ??
      (application as { id?: string }).id ??
      "";
    dokployResources.applicationId = applicationId;

    await applyPlanResourceLimits(dokploy, applicationId, user.plan);

    await syncDokployGitSource({
      dokployAppId: applicationId,
      installationId: user.githubInstallationId,
      owner: githubOwner,
      repo: githubRepo,
      branch: githubBranch,
      buildPath,
    });

    if (buildType === "dockerfile") {
      await dokploy.saveBuildType({
        applicationId,
        buildType: "dockerfile",
        dockerfile: dockerfile?.trim() || "Dockerfile",
        dockerContextPath: dockerContextPath?.trim() || ".",
        dockerBuildStage: dockerBuildStage?.trim() || null,
        publishDirectory: "dist",
        isStaticSpa: false,
      });
    } else if (buildType !== "nixpacks") {
      await dokploy.saveBuildType({
        applicationId,
        buildType,
        dockerfile: dockerfile?.trim() || "Dockerfile",
        dockerContextPath: dockerContextPath?.trim() || ".",
        dockerBuildStage: dockerBuildStage?.trim() || null,
        publishDirectory: "dist",
        isStaticSpa: buildType === "static",
      });
    }

    const envPayload = env?.filter((row) => row.key.trim()) ?? [];
    const buildSecretsPayload =
      buildSecrets?.filter((row) => row.key.trim()) ?? [];
    const buildArgsPayload = buildArgs?.filter((row) => row.key.trim()) ?? [];

    if (
      envPayload.length > 0 ||
      buildSecretsPayload.length > 0 ||
      buildArgsPayload.length > 0
    ) {
      await dokploy.saveEnvironment({
        applicationId,
        env: serializeEnvVars(envPayload) || null,
        buildSecrets: serializeEnvVars(buildSecretsPayload) || null,
        buildArgs: serializeEnvVars(buildArgsPayload) || null,
        createEnvFile: true,
      });
    }

    const dockerfileText = await fetchDockerfileText({
      installationId: user.githubInstallationId,
      owner: githubOwner,
      repo: githubRepo,
      branch: githubBranch,
      buildPath,
      dockerfile,
      dockerContextPath,
    });
    const containerPort = resolveContainerPort({
      buildType,
      env: envPayload,
      dockerfileText,
    });

    const domain = await dokploy.createDomain({
      host: subdomain,
      applicationId,
      port: containerPort,
    });

    const domainId =
      (domain as { domainId?: string }).domainId ??
      (domain as { id?: string }).id ??
      null;
    dokployResources.domainId = domainId;

    if (deployImmediately) {
      await dokploy.deploy({
        applicationId,
        title: "Initial deployment",
        description: `Deploy ${githubOwner}/${githubRepo}@${githubBranch}`,
      });
    }

    const nextStatus = deployImmediately ? "deploying" : "stopped";

    const [app] = await db
      .update(apps)
      .set({
        dokployAppId: applicationId,
        dokployDomainId: domainId,
        subdomain,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(apps.id, reservedApp.id))
      .returning();

    reservedAppId = null;

    if (deployImmediately) {
      await syncDeploymentsFromDokploy(dokploy, app.id, applicationId);
    }

    recordAuditEvent({
      userId: authResult.user.id,
      appId: app.id,
      action: AUDIT_ACTIONS.appCreate,
      request,
      metadata: {
        name,
        repo: `${githubOwner}/${githubRepo}`,
        branch: githubBranch,
        buildType,
        deployImmediately,
      },
    });

    return NextResponse.json({
      app,
      url: getAppPublicUrl(app),
    });
  } catch (error) {
    if (error instanceof AppPlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof InvalidAppSlugError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Create app error:", error);

    if (reservedAppId) {
      await releaseAppSlot(reservedAppId);
    }

    if (dokployResources.applicationId || dokployResources.domainId) {
      await cleanupDokployProvision(getDokployClient(), dokployResources);
    }

    return NextResponse.json(
      {
        error: toClientError(error, "Failed to create application"),
      },
      { status: 500 }
    );
  }
}
