import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, apps, deployments } from "@/db/schema";
import { getDokployClient, getAppUrl } from "@/lib/dokploy";
import { getPlanLimit } from "@/lib/plans";
import { slugify } from "@/lib/utils";
import type { Plan } from "@/lib/plans";

const createAppSchema = z.object({
  name: z.string().min(1).max(63),
  githubOwner: z.string().min(1),
  githubRepo: z.string().min(1),
  githubBranch: z.string().min(1).default("main"),
  githubId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
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
  const session = await auth();
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

    const { name, githubOwner, githubRepo, githubBranch, githubId } =
      parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
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

    const [{ value: appCount }] = await db
      .select({ value: count() })
      .from(apps)
      .where(eq(apps.userId, user.id));

    const limit = getPlanLimit(user.plan as Plan);
    if (appCount >= limit) {
      return NextResponse.json(
        { error: `Plan limit reached (${limit} apps). Upgrade to deploy more.` },
        { status: 403 }
      );
    }

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const [existing] = await db
        .select({ id: apps.id })
        .from(apps)
        .where(eq(apps.slug, slug))
        .limit(1);
      if (!existing) break;
      slug = `${baseSlug}-${suffix++}`;
    }

    const dokploy = getDokployClient();
    let projectId = user.dokployProjectId;
    let environmentId = user.dokployEnvironmentId;

    if (!projectId || !environmentId) {
      const project = await dokploy.createProject({
        name: `hostingit-${user.id.slice(0, 8)}`,
        description: `HostingIt project for ${user.email}`,
      });

      projectId =
        (project as { projectId?: string }).projectId ??
        (project as { id?: string }).id ??
        "";

      const projectDetails = await dokploy.getProject(projectId);
      environmentId =
        (projectDetails as { environments?: Array<{ environmentId: string }> })
          .environments?.[0]?.environmentId ??
        (projectDetails as { environmentId?: string }).environmentId ??
        projectId;

      await db
        .update(users)
        .set({
          dokployProjectId: projectId,
          dokployEnvironmentId: environmentId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    const application = await dokploy.createApplication({
      name,
      appName: slug,
      environmentId,
    });

    const applicationId =
      (application as { applicationId?: string }).applicationId ??
      (application as { id?: string }).id ??
      "";

    await dokploy.saveGithubProvider({
      applicationId,
      owner: githubOwner,
      repository: githubRepo,
      branch: githubBranch,
      githubId: githubId ?? null,
    });

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "yourdomain.com";
    const subdomain = `${slug}.${baseDomain}`;

    const domain = await dokploy.createDomain({
      host: subdomain,
      applicationId,
    });

    const domainId =
      (domain as { domainId?: string }).domainId ??
      (domain as { id?: string }).id ??
      null;

    await dokploy.deploy({
      applicationId,
      title: "Initial deployment",
      description: `Deploy ${githubOwner}/${githubRepo}@${githubBranch}`,
    });

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
        status: "deploying",
      })
      .returning();

    await db.insert(deployments).values({
      appId: app.id,
      status: "running",
    });

    return NextResponse.json({
      app,
      url: getAppUrl(slug),
    });
  } catch (error) {
    console.error("Create app error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create application",
      },
      { status: 500 }
    );
  }
}
