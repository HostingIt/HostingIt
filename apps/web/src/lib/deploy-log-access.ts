import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deployments } from "@/db/schema";
import type { DokployClient } from "@hostingit/dokploy-client";

/** Ensure deploymentId belongs to this HostingIt app before reading build logs. */
export async function assertDeploymentBelongsToApp(
  dokploy: DokployClient,
  appId: string,
  dokployAppId: string,
  deploymentId: string
): Promise<boolean> {
  const [local] = await db
    .select({ id: deployments.id })
    .from(deployments)
    .where(
      and(
        eq(deployments.appId, appId),
        eq(deployments.dokployDeploymentId, deploymentId)
      )
    )
    .limit(1);

  if (local) return true;

  try {
    const remote = await dokploy.listDeployments(dokployAppId);
    return remote.some((d) => d.deploymentId === deploymentId);
  } catch {
    return false;
  }
}
