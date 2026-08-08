import type { App } from "@/db/schema";
import type { DokployClient } from "@hostingit/dokploy-client";
import { getDokployClient } from "@/lib/dokploy";

export function isProvisionedDokployAppId(id: string): boolean {
  return id.length > 0 && !id.startsWith("pending:");
}

/** Delete domain + application in Dokploy (best-effort). */
export async function deleteDokployApplication(
  dokploy: DokployClient,
  app: Pick<App, "dokployAppId" | "dokployDomainId">
): Promise<void> {
  if (!isProvisionedDokployAppId(app.dokployAppId)) {
    return;
  }

  if (app.dokployDomainId) {
    try {
      await dokploy.deleteDomain(app.dokployDomainId);
    } catch (error) {
      console.error("Dokploy domain delete error:", error);
    }
  }

  try {
    await dokploy.deleteApplication(app.dokployAppId);
  } catch (error) {
    console.error("Dokploy application delete error:", error);
  }
}

/**
 * Remove the user's Dokploy project (apps, build dirs, volumes in project).
 * Prefer this when the user has no remaining apps or is deleting their account.
 */
export async function deleteDokployProject(
  dokploy: DokployClient,
  projectId: string | null | undefined
): Promise<void> {
  if (!projectId?.trim()) return;

  try {
    await dokploy.deleteProject(projectId);
  } catch (error) {
    console.error("Dokploy project delete error:", projectId, error);
  }
}

export function getDokployClientOrNull(): DokployClient | null {
  try {
    return getDokployClient();
  } catch {
    return null;
  }
}
