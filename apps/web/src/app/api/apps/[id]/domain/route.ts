import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { fetchDockerfileText } from "@/lib/dokploy-domain";
import { resolveContainerPort } from "@/lib/container-port";
import { parseEnvString } from "@/lib/env-vars";
import { canUseCustomDomain } from "@/lib/plans";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";

const HOSTNAME_RE =
  /^(?=.{1,253}$)(?!-)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.(?!-)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const domainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .refine((d) => HOSTNAME_RE.test(d), "Invalid hostname")
    .refine((d) => !/^\d+\.\d+\.\d+\.\d+$/.test(d), "IP addresses not allowed")
    .refine((d) => !d.endsWith(".local") && !d.endsWith(".internal"), "Invalid TLD"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = domainSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const plan = session.user.plan ?? "free";
  if (!canUseCustomDomain(plan)) {
    return NextResponse.json(
      { error: "Custom domains require Pro plan or higher" },
      { status: 403 }
    );
  }

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
    const remote = await dokploy.getApplication(app.dokployAppId);
    const [owner] = await db
      .select({ installationId: users.githubInstallationId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const dockerfileText = await fetchDockerfileText({
      installationId: owner?.installationId,
      owner: app.githubOwner,
      repo: app.githubRepo,
      branch: app.githubBranch,
      buildPath: remote.customGitBuildPath ?? remote.buildPath ?? "/",
      dockerfile: remote.dockerfile,
      dockerContextPath: remote.dockerContextPath,
    });
    const containerPort = resolveContainerPort({
      buildType: remote.buildType,
      env: parseEnvString(remote.env),
      dockerfileText,
    });
    const domain = await dokploy.createDomain({
      host: parsed.data.domain,
      applicationId: app.dokployAppId,
      port: containerPort,
    });

    await db
      .update(apps)
      .set({
        customDomain: parsed.data.domain,
        dokployDomainId:
          (domain as { domainId?: string }).domainId ?? app.dokployDomainId,
        updatedAt: new Date(),
      })
      .where(eq(apps.id, app.id));

    recordAuditEvent({
      userId: session.user.id,
      appId: app.id,
      action: AUDIT_ACTIONS.appDomainUpdate,
      request,
      metadata: { domain: parsed.data.domain },
    });

    return NextResponse.json({ success: true, domain: parsed.data.domain });
  } catch (error) {
    console.error("Custom domain error:", error);
    return NextResponse.json(
      { error: "Failed to add custom domain" },
      { status: 500 }
    );
  }
}
