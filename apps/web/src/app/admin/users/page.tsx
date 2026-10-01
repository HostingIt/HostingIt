import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, auditLogs, users } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { UsersTable, type AdminUserRow } from "@/components/admin/users-table";
import { timeAgo } from "@/components/security/audit-meta";
import { getAppPublicUrl } from "@/lib/dokploy";
import { isUnlimitedHosting } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";
import { describeUserAgent } from "@/lib/user-agent";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(date);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;

  const appCounts = db
    .select({ userId: apps.userId, value: count().as("app_count") })
    .from(apps)
    .groupBy(apps.userId)
    .as("app_counts");

  const [rows, lastLogins, allApps] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        plan: users.plan,
        accountStatus: users.accountStatus,
        role: users.role,
        githubId: users.githubId,
        googleId: users.googleId,
        githubInstallationId: users.githubInstallationId,
        totpEnabled: users.totpEnabled,
        createdAt: users.createdAt,
        appCount: appCounts.value,
      })
      .from(users)
      .leftJoin(appCounts, eq(appCounts.userId, users.id))
      .orderBy(desc(users.createdAt)),
    db
      .selectDistinctOn([auditLogs.userId], {
        userId: auditLogs.userId,
        createdAt: auditLogs.createdAt,
        ip: auditLogs.ip,
        userAgent: auditLogs.userAgent,
      })
      .from(auditLogs)
      .where(eq(auditLogs.action, "auth.login"))
      .orderBy(auditLogs.userId, desc(auditLogs.createdAt)),
    db
      .select({
        id: apps.id,
        userId: apps.userId,
        name: apps.name,
        status: apps.status,
        slug: apps.slug,
        subdomain: apps.subdomain,
        customDomain: apps.customDomain,
      })
      .from(apps)
      .orderBy(desc(apps.createdAt)),
  ]);

  const loginByUser = new Map(lastLogins.map((l) => [l.userId, l]));
  const appsByUser = new Map<string, AdminUserRow["apps"]>();
  for (const app of allApps) {
    const list = appsByUser.get(app.userId) ?? [];
    list.push({
      id: app.id,
      name: app.name,
      status: app.status,
      url: getAppPublicUrl(app),
    });
    appsByUser.set(app.userId, list);
  }

  const data: AdminUserRow[] = rows.map((u) => {
    const login = loginByUser.get(u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      accountStatus: u.accountStatus,
      role: u.role,
      providers: [u.githubId ? "GitHub" : null, u.googleId ? "Google" : null].filter(
        (p): p is string => p !== null
      ),
      githubAppInstalled: !!u.githubInstallationId,
      totpEnabled: u.totpEnabled,
      joined: formatDate(u.createdAt),
      joinedAgo: timeAgo(u.createdAt),
      lastLogin: login
        ? {
            ago: timeAgo(login.createdAt),
            device: describeUserAgent(login.userAgent).label,
            ip: login.ip,
          }
        : null,
      appCount: Number(u.appCount ?? 0),
      apps: appsByUser.get(u.id) ?? [],
      isSuperAdmin: isUnlimitedHosting(u),
      isSelf: u.id === session.user.id,
    };
  });

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        title="Users"
        description="Search accounts, review their security posture, and manage plans and access."
      />
      <UsersTable users={data} initialUserId={params.user ?? null} />
    </div>
  );
}
