import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";

function isProvisionedDokployAppId(id: string): boolean {
  return id.length > 0 && !id.startsWith("pending:");
}

/** Remove Dokploy workloads then delete the user (DB cascades apps, sessions, etc.). */
export async function deleteUserAccount(userId: string): Promise<void> {
  const userApps = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, userId));

  const dokploy = getDokployClient();

  for (const app of userApps) {
    if (!isProvisionedDokployAppId(app.dokployAppId)) {
      continue;
    }
    try {
      if (app.dokployDomainId) {
        await dokploy.deleteDomain(app.dokployDomainId);
      }
      await dokploy.deleteApplication(app.dokployAppId);
    } catch (error) {
      console.error("Dokploy cleanup error for app:", app.id, error);
    }
  }

  await db.delete(users).where(eq(users.id, userId));
}
