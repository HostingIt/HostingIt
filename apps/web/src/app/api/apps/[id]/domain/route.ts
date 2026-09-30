import { NextResponse } from "next/server";
import { eq, and, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { fetchDockerfileText } from "@/lib/dokploy-domain";
import { resolveContainerPort } from "@/lib/container-port";
import { parseEnvString } from "@/lib/env-vars";
import { canUseCustomDomain } from "@/lib/plans";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { requireApiUser } from "@/lib/api-auth";
import {
  domainVerificationRecord,
  isDomainVerified,
  isReservedDomain,
  reservedDomainRoots,
} from "@/lib/custom-domain";

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
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = domainSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }
  const domain = parsed.data.domain;

  if (isReservedDomain(domain, reservedDomainRoots())) {
    return NextResponse.json(
      { error: "That domain is reserved by HostingIt and can't be used." },
      { status: 400 }
    );
  }

  const plan = authResult.user.plan;
  if (!canUseCustomDomain(plan)) {
    return NextResponse.json(
      { error: "Custom domains require Pro plan or higher" },
      { status: 403 }
    );
  }

  const [app] = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, authResult.user.id)))
    .limit(1);

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const [taken] = await db
    .select({ id: apps.id })
    .from(apps)
    .where(
      and(
        ne(apps.id, app.id),
        or(eq(apps.customDomain, domain), eq(apps.subdomain, domain))
      )
    )
    .limit(1);

  if (taken) {
    return NextResponse.json(
      { error: "That domain is already attached to another app." },
      { status: 409 }
    );
  }

  // Prove control of the domain before routing it; otherwise any tenant could
  // point a Traefik router at a hostname they don't own.
  if (!(await isDomainVerified(authResult.user.id, domain))) {
    return NextResponse.json(
      {
        error:
          "Add this DNS TXT record to verify you own the domain, then try again.",
        verification: domainVerificationRecord(authResult.user.id, domain),
      },
      { status: 422 }
    );
  }

  try {
    const dokploy = getDokployClient();
    const remote = await dokploy.getApplication(app.dokployAppId);
    const [owner] = await db
      .select({ installationId: users.githubInstallationId })
      .from(users)
      .where(eq(users.id, authResult.user.id))
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
    const created = await dokploy.createDomain({
      host: domain,
      applicationId: app.dokployAppId,
      port: containerPort,
    });

    await db
      .update(apps)
      .set({
        customDomain: domain,
        dokployDomainId:
          (created as { domainId?: string }).domainId ?? app.dokployDomainId,
        updatedAt: new Date(),
      })
      .where(eq(apps.id, app.id));

    recordAuditEvent({
      userId: authResult.user.id,
      appId: app.id,
      action: AUDIT_ACTIONS.appDomainUpdate,
      request,
      metadata: { domain },
    });

    return NextResponse.json({ success: true, domain });
  } catch (error) {
    console.error("Custom domain error:", error);
    return NextResponse.json(
      { error: "Failed to add custom domain" },
      { status: 500 }
    );
  }
}
