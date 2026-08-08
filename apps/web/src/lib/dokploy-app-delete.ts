import type { App } from "@/db/schema";
import {
  deleteDokployApplication,
  deleteDokployProject,
  getDokployClientOrNull,
} from "@/lib/dokploy-cleanup";

/**
 * Remove Dokploy resources for an app being deleted.
 * When this is the user's only app, remove the whole project (including volumes).
 */
export async function deleteAppFromDokploy(
  app: Pick<App, "dokployProjectId" | "dokployAppId" | "dokployDomainId">,
  userAppCountIncludingThis: number
): Promise<void> {
  const dokploy = getDokployClientOrNull();
  if (!dokploy) return;

  if (userAppCountIncludingThis <= 1) {
    await deleteDokployProject(dokploy, app.dokployProjectId);
    return;
  }

  await deleteDokployApplication(dokploy, app);
}
