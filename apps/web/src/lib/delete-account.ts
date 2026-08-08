import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import {
  deleteDokployApplication,
  deleteDokployProject,
  getDokployClientOrNull,
} from "@/lib/dokploy-cleanup";

/** Remove Dokploy workloads then delete the user (DB cascades apps, sessions, etc.). */
export async function deleteUserAccount(userId: string): Promise<void> {
  const [user] = await db
    .select({
      dokployProjectId: users.dokployProjectId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const dokploy = getDokployClientOrNull();

  if (dokploy && user?.dokployProjectId) {
    await deleteDokployProject(dokploy, user.dokployProjectId);
  } else if (dokploy) {
    const userApps = await db
      .select()
      .from(apps)
      .where(eq(apps.userId, userId));

    for (const app of userApps) {
      await deleteDokployApplication(dokploy, app);
    }
  }

  await db.delete(users).where(eq(users.id, userId));
}
