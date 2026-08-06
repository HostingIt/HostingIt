import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getAppPublicUrl } from "@/lib/dokploy";
import { AppShell } from "@/components/apps/app-shell";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const [app] = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, session.user.id)))
    .limit(1);

  if (!app) {
    notFound();
  }

  return <AppShell app={app} url={getAppPublicUrl(app)} />;
}
