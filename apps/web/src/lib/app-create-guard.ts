import { randomUUID } from "crypto";
import { eq, count, like, sql } from "drizzle-orm";
import type { DokployClient } from "@hostingit/dokploy-client";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getPlanLimit } from "@/lib/plans";
import { slugify } from "@/lib/utils";
import { getAppHostname } from "@/lib/dokploy";

export class AppPlanLimitError extends Error {
  readonly limit: number;

  constructor(limit: number) {
    super(`Plan limit reached (${limit} apps). Upgrade to deploy more.`);
    this.limit = limit;
  }
}

export type ReservedApp = typeof apps.$inferSelect;

export type DokployProvisionResources = {
  applicationId?: string;
  domainId?: string | null;
};

/** Pick a globally unique slug inside the user's creation lock. */
async function allocateSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  name: string
): Promise<string> {
  const baseSlug = slugify(name);
  const taken = await tx
    .select({ slug: apps.slug })
    .from(apps)
    .where(like(apps.slug, `${baseSlug}%`));
  const takenSet = new Set(taken.map((row) => row.slug));
  let slug = baseSlug;
  let suffix = 1;
  while (takenSet.has(slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }
  return slug;
}

/**
 * Atomically reserve an app slot: locks the user row, checks plan limit, inserts
 * a `creating` row so concurrent requests cannot bypass free-tier limits.
 */
export async function reserveAppSlot(input: {
  userId: string;
  plan: string;
  name: string;
  projectId: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
}): Promise<{ app: ReservedApp; slug: string; subdomain: string }> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT 1 FROM users WHERE id = ${input.userId} FOR UPDATE`
    );

    const [{ value: appCount }] = await tx
      .select({ value: count() })
      .from(apps)
      .where(eq(apps.userId, input.userId));

    const limit = getPlanLimit(input.plan);
    if (appCount >= limit) {
      throw new AppPlanLimitError(limit);
    }

    const slug = await allocateSlug(tx, input.name);
    const subdomain = getAppHostname(slug);

    const placeholderAppId = `pending:${randomUUID()}`;

    const [app] = await tx
      .insert(apps)
      .values({
        userId: input.userId,
        name: input.name,
        slug,
        dokployProjectId: input.projectId,
        dokployAppId: placeholderAppId,
        githubOwner: input.githubOwner,
        githubRepo: input.githubRepo,
        githubBranch: input.githubBranch,
        subdomain,
        status: "creating",
      })
      .returning();

    return { app, slug, subdomain };
  });
}

/** Remove a reserved row when provisioning fails before completion. */
export async function releaseAppSlot(appId: string): Promise<void> {
  await db.delete(apps).where(eq(apps.id, appId));
}

/** Best-effort Dokploy cleanup after a failed provision. */
export async function cleanupDokployProvision(
  dokploy: DokployClient,
  resources: DokployProvisionResources
): Promise<void> {
  if (resources.domainId) {
    try {
      await dokploy.deleteDomain(resources.domainId);
    } catch (error) {
      console.error("Dokploy domain cleanup error:", error);
    }
  }

  if (resources.applicationId) {
    try {
      await dokploy.deleteApplication(resources.applicationId);
    } catch (error) {
      console.error("Dokploy application cleanup error:", error);
    }
  }
}
