import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, count, like } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { users, apps, deployments } from "@/db/schema";
import {
  getDokployClient,
  getAppHostname,
  getAppPublicUrl,
} from "@/lib/dokploy";
import { getPlanLimit } from "@/lib/plans";
import { slugify } from "@/lib/utils";
import { serializeEnvVars } from "@/lib/env-vars";
import { envVarListSchema } from "@/lib/env-var-schema";
import { syncDokployGitSource } from "@/lib/deploy-git";
import { ensureUserDokployEnvironment } from "@/lib/dokploy-user";
import { applyPlanResourceLimits } from "@/lib/app-resources";
import { toClientError } from "@/lib/safe-error";

const createAppSchema = z.object({
  name: z.string().min(1).max(63),
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
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userApps = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, session.user.id));

  return NextResponse.json({ apps: userApps });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    const [[user], [{ value: appCount }]] = await Promise.all([
      db.select().from(users).where(eq(users.id, session.user.id)).limit(1),
      db
        .select({ value: count() })
        .from(apps)
        .where(eq(apps.userId, session.user.id)),
    ]);

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

    const limit = getPlanLimit(user.plan);
    if (appCount >= limit) {
      return NextResponse.json(
        { error: `Plan limit reached (${limit} apps). Upgrade to deploy more.` },
        { status: 403 }
      );
    }

    const baseSlug = slugify(name);
    const taken = await db
      .select({ slug: apps.slug })
      .from(apps)
      .where(like(apps.slug, `${baseSlug}%`));
    const takenSet = new Set(taken.map((row) => row.slug));
    let slug = baseSlug;
    let suffix = 1;
    while (takenSet.has(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const dokploy = getDokployClient();
    const { projectId, environmentId } = await ensureUserDokployEnvironment(user);

    const application = await dokploy.createApplication({
      name,
      appName: slug,
      environmentId,
    });

    const applicationId =
      (application as { applicationId?: string }).applicationId ??
      (application as { id?: string }).id ??
      "";

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

    const subdomain = getAppHostname(slug);

    const domain = await dokploy.createDomain({
      host: subdomain,
      applicationId,
    });

    const domainId =
      (domain as { domainId?: string }).domainId ??
      (domain as { id?: string }).id ??
      null;

    if (deployImmediately) {
      await dokploy.deploy({
        applicationId,
        title: "Initial deployment",
        description: `Deploy ${githubOwner}/${githubRepo}@${githubBranch}`,
      });
    }

    const [app] = await db
      .insert(apps)
      .values({
        userId: user.id,
        name,
        slug,
        dokployProjectId: projectId,
        dokployAppId: applicationId,
        dokployDomainId: domainId,
        githubOwner,
        githubRepo,
        githubBranch,
        subdomain,
        status: deployImmediately ? "deploying" : "stopped",
      })
      .returning();

    if (deployImmediately) {
      await db.insert(deployments).values({
        appId: app.id,
        status: "running",
      });
    }

    return NextResponse.json({
      app,
      url: getAppPublicUrl(app),
    });
  } catch (error) {
    console.error("Create app error:", error);
    return NextResponse.json(
      {
        error:
          toClientError(error, "Failed to create application"),
      },
      { status: 500 }
    );
  }
}
