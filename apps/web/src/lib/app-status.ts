import type { ApplicationStatus } from "@hostingit/dokploy-client";
import type { DokployClient } from "@hostingit/dokploy-client";

export type LocalAppStatus =
  | "creating"
  | "deploying"
  | "running"
  | "stopped"
  | "error";

/**
 * Map Dokploy applicationStatus to HostingIt app status.
 * Dokploy uses "done" for a healthy running container (not "stopped").
 */
export function mapDokployApplicationStatus(
  status: ApplicationStatus | undefined
): LocalAppStatus | null {
  switch (status) {
    case "running":
    case "done":
      return "running";
    case "idle":
      return "stopped";
    case "error":
      return "error";
    default:
      return null;
  }
}

/** Resolve status from Dokploy app + in-flight deployments. */
export async function resolveAppStatus(
  dokploy: DokployClient,
  dokployAppId: string,
  fallback: LocalAppStatus
): Promise<LocalAppStatus> {
  const [remote, deployments] = await Promise.all([
    dokploy.getApplication(dokployAppId),
    dokploy.listDeployments(dokployAppId).catch(() => []),
  ]);

  const hasActiveDeploy = deployments.some((d) => d.status === "running");
  if (hasActiveDeploy) return "deploying";

  const sorted = [...deployments].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
  );
  const latest = sorted[0];
  if (latest?.status === "error" || latest?.status === "cancelled") {
    return "error";
  }

  return mapDokployApplicationStatus(remote.applicationStatus) ?? fallback;
}
