import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { syncDokployGitSource } from "@/lib/deploy-git";
import { applyPlanResourceLimits } from "@/lib/app-resources";
import { syncAppDomainPort } from "@/lib/dokploy-domain";
import { syncDeploymentsFromDokploy } from "@/lib/deployments";
import { toClientError } from "@/lib/safe-error";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [row] = await db
    .select({
      app: apps,
      installationId: users.githubInstallationId,
      plan: users.plan,
    })
    .from(apps)
    .innerJoin(users, eq(users.id, apps.userId))
    .where(and(eq(apps.id, id), eq(apps.userId, session.user.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  if (!row.installationId) {
    return NextResponse.json(
      {
        error:
          "GitHub App is not installed. Reinstall it from Settings to redeploy.",
      },
      { status: 403 }
    );
  }

  try {
    const dokploy = getDokployClient();
    const remote = await dokploy.getApplication(row.app.dokployAppId);

    await applyPlanResourceLimits(
      dokploy,
      row.app.dokployAppId,
      row.plan
    );

    await syncDokployGitSource({
      dokployAppId: row.app.dokployAppId,
      installationId: row.installationId,
      owner: row.app.githubOwner,
      repo: row.app.githubRepo,
      branch: row.app.githubBranch,
      buildPath: remote.customGitBuildPath ?? remote.buildPath ?? "/",
    });

    await syncAppDomainPort(dokploy, row.app, {
      buildType: remote.buildType,
      envRaw: remote.env,
      dockerfile: remote.dockerfile,
      dockerContextPath: remote.dockerContextPath,
      buildPath: remote.customGitBuildPath ?? remote.buildPath ?? "/",
      installationId: row.installationId,
    });
    await dokploy.redeploy(row.app.dokployAppId);

    await db
      .update(apps)
      .set({ status: "deploying", updatedAt: new Date() })
      .where(eq(apps.id, row.app.id));

    await syncDeploymentsFromDokploy(dokploy, row.app.id, row.app.dokployAppId);

    recordAuditEvent({
      userId: session.user.id,
      appId: row.app.id,
      action: AUDIT_ACTIONS.appRedeploy,
      request,
      metadata: { repo: `${row.app.githubOwner}/${row.app.githubRepo}`, branch: row.app.githubBranch },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Redeploy error:", error);
    return NextResponse.json(
      {
        error:
          toClientError(error, "Failed to redeploy application"),
      },
      { status: 500 }
    );
  }
}
