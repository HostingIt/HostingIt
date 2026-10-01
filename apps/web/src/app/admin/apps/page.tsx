import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { InstancesTable, type AdminInstanceRow } from "@/components/admin/instances-table";
import { timeAgo } from "@/components/security/audit-meta";
import { getAppPublicUrl } from "@/lib/dokploy";
import { getPlanConfig } from "@/lib/plans";
import { formatSpec } from "@/lib/resource-limits";

export default async function AdminAppsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;

  const rows = await db
    .select({ app: apps, ownerEmail: users.email, plan: users.plan })
    .from(apps)
    .innerJoin(users, eq(apps.userId, users.id))
    .orderBy(desc(apps.createdAt));

  const data: AdminInstanceRow[] = rows.map(({ app, ownerEmail, plan }) => ({
    id: app.id,
    name: app.name,
    status: app.status,
    ownerId: app.userId,
    ownerEmail,
    plan,
    planLimits: formatSpec(getPlanConfig(plan)),
    url: getAppPublicUrl(app),
    repo: `${app.githubOwner}/${app.githubRepo}`,
    branch: app.githubBranch,
    customDomain: !!app.customDomain,
    createdAgo: timeAgo(app.createdAt),
  }));

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        title="Instances"
        description="Every app container on the platform, with live CPU/RAM limit checks against the running task."
      />
      <InstancesTable
        instances={data}
        initialQuery={params.q ?? ""}
        initialStatus={params.status ?? "all"}
      />
    </div>
  );
}
