import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";

export async function getOwnedApp(userId: string, appId: string) {
  const [app] = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.userId, userId)))
    .limit(1);
  return app ?? null;
}
