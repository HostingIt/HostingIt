import { eq } from "drizzle-orm";
import type { Deployment as DokployDeployment } from "@hostingit/dokploy-client";
import { db } from "@/db";
import { deployments } from "@/db/schema";

export type LocalDeploymentStatus = "pending" | "running" | "success" | "failed";

/** DTO shared by API route and DeploymentsTab client component. */
export interface DeploymentListItem {
  deploymentId: string;
  title: string;
  status: DokployDeployment["status"];
  errorMessage: string | null;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export function mapDokployDeploymentStatus(
  status: DokployDeployment["status"]
): LocalDeploymentStatus {
  switch (status) {
    case "done":
      return "success";
    case "error":
    case "cancelled":
      return "failed";
    case "running":
      return "running";
    default:
      return "pending";
  }
}

export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDeploymentListItem(d: DokployDeployment): DeploymentListItem {
  return {
    deploymentId: d.deploymentId,
    title: d.title ?? "Deployment",
    status: d.status,
    errorMessage: d.errorMessage ?? null,
    createdAt: d.createdAt ?? null,
    startedAt: d.startedAt ?? null,
    finishedAt: d.finishedAt ?? null,
  };
}

/** Upsert local deployment rows keyed by Dokploy deployment id. */
export async function syncLocalDeployments(
  appId: string,
  remote: DokployDeployment[]
) {
  const existing = await db
    .select({
      id: deployments.id,
      dokployDeploymentId: deployments.dokployDeploymentId,
    })
    .from(deployments)
    .where(eq(deployments.appId, appId));

  const byDokployId = new Map(
    existing
      .filter((row) => row.dokployDeploymentId)
      .map((row) => [row.dokployDeploymentId!, row.id])
  );

  for (const d of remote) {
    if (!d.deploymentId) continue;

    const localStatus = mapDokployDeploymentStatus(d.status);
    const finishedAt = parseTimestamp(d.finishedAt);
    const startedAt =
      parseTimestamp(d.startedAt) ?? parseTimestamp(d.createdAt) ?? new Date();

    const existingId = byDokployId.get(d.deploymentId);
    if (existingId) {
      await db
        .update(deployments)
        .set({ status: localStatus, finishedAt })
        .where(eq(deployments.id, existingId));
    } else {
      await db.insert(deployments).values({
        appId,
        dokployDeploymentId: d.deploymentId,
        status: localStatus,
        startedAt,
        finishedAt,
      });
    }
  }
}
