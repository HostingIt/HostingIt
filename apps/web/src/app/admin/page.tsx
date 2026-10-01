import { Suspense } from "react";
import Link from "next/link";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  Boxes,
  Cpu,
  HeartPulse,
  KeyRound,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { db } from "@/db";
import { apps, auditLogs, users } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreakdownBar, StatCard } from "@/components/admin/stat-card";
import { EnforceLimitsButton } from "@/components/admin/enforce-limits-button";
import { ProUpcomingBanner } from "@/components/billing/pro-upcoming-banner";
import { daysAgo, metaFor, timeAgo } from "@/components/security/audit-meta";
import { getDokployClient } from "@/lib/dokploy";
import { PLANS } from "@/lib/plans";
import { formatSpec } from "@/lib/resource-limits";

const ALERT_ACTIONS = [
  "auth.2fa.verify_failed",
  "app.delete",
  "github.uninstall",
  "account.delete",
];

function countWhere(condition: ReturnType<typeof sql>) {
  return sql<number>`count(*) filter (where ${condition})`.mapWith(Number);
}

async function DokployHealth() {
  let ok = false;
  let message = "Not configured";
  try {
    const client = getDokployClient();
    const result = await Promise.race([
      client.healthCheck(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      ),
    ]);
    ok = result.ok;
    message = ok ? "Reachable" : "Unhealthy";
  } catch (error) {
    message =
      error instanceof Error && error.message === "timeout"
        ? "Timed out after 5s"
        : "Unreachable";
  }
  return (
    <StatCard
      label="Deploy platform"
      icon={HeartPulse}
      tone={ok ? "good" : "danger"}
      value={ok ? "Online" : "Offline"}
      detail={message}
    />
  );
}

export default async function AdminOverviewPage() {
  const since7 = daysAgo(7);

  const [[userStats], appsByStatus, recentUsers, alerts] = await Promise.all([
    db
      .select({
        total: count(),
        new7d: countWhere(sql`${users.createdAt} >= ${since7.toISOString()}`),
        active: countWhere(sql`${users.accountStatus} = 'active'`),
        suspended: countWhere(sql`${users.accountStatus} = 'suspended'`),
        pending: countWhere(sql`${users.accountStatus} = 'pending'`),
        twoFactor: countWhere(sql`${users.totpEnabled}`),
        free: countWhere(sql`${users.plan} = 'free'`),
        pro: countWhere(sql`${users.plan} = 'pro'`),
        enterprise: countWhere(sql`${users.plan} = 'enterprise'`),
      })
      .from(users),
    db
      .select({ status: apps.status, value: count() })
      .from(apps)
      .groupBy(apps.status),
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        plan: users.plan,
        totpEnabled: users.totpEnabled,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(6),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        email: users.email,
      })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.userId))
      .where(
        and(inArray(auditLogs.action, ALERT_ACTIONS), gte(auditLogs.createdAt, since7))
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(8),
  ]);

  const statusCount = (s: string) =>
    appsByStatus.find((r) => r.status === s)?.value ?? 0;
  const totalApps = appsByStatus.reduce((sum, r) => sum + r.value, 0);
  const totalUsers = userStats?.total ?? 0;
  const twoFactorPct =
    totalUsers > 0 ? Math.round(((userStats?.twoFactor ?? 0) / totalUsers) * 100) : 0;
  const failed2fa = alerts.filter((a) => a.action === "auth.2fa.verify_failed").length;

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        title="Admin console"
        description="Platform health, users, and every running instance at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          icon={Users}
          href="/admin/users"
          value={totalUsers}
          detail={
            <>
              <span className="text-ink">+{userStats?.new7d ?? 0}</span> in the last 7 days
            </>
          }
        />
        <StatCard
          label="Instances"
          icon={Boxes}
          href="/admin/apps"
          value={totalApps}
          detail={`${statusCount("running")} running · ${statusCount("error")} in error`}
          tone={statusCount("error") > 0 ? "warn" : "default"}
        />
        <StatCard
          label="2FA adoption"
          icon={KeyRound}
          tone={twoFactorPct === 100 ? "good" : "warn"}
          value={`${twoFactorPct}%`}
          detail={`${userStats?.twoFactor ?? 0} of ${totalUsers} enrolled`}
        />
        <Suspense
          fallback={<div className="skeleton skeleton-text h-full min-h-[104px] rounded-[14px]" />}
        >
          <DokployHealth />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="card-elevated border-border lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Cpu className="h-4 w-4 text-accent" aria-hidden />
                Resource limits
              </CardTitle>
              <p className="mt-1 text-sm text-muted">
                Dokploy only applies CPU/RAM caps when it re-creates a container.
                Use this after changing plan limits so running apps pick them up.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              {(["free", "pro"] as const).map((key) => (
                <div
                  key={key}
                  className="rounded-lg border border-border bg-background/60 p-3"
                >
                  <dt className="text-xs text-muted">
                    {PLANS[key].name}
                    {key === "pro" ? " (assigned manually)" : ""}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink">
                    {formatSpec(PLANS[key])} · {PLANS[key].maxApps} app
                    {PLANS[key].maxApps === 1 ? "" : "s"}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <EnforceLimitsButton />
              <Link href="/admin/apps" className="text-sm text-accent hover:underline">
                Check each instance →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Instances by status
              </p>
              <BreakdownBar
                items={[
                  { label: "Running", value: statusCount("running"), className: "bg-emerald-500" },
                  {
                    label: "Deploying",
                    value: statusCount("deploying") + statusCount("creating"),
                    className: "bg-sky-500",
                  },
                  { label: "Stopped", value: statusCount("stopped"), className: "bg-zinc-400" },
                  { label: "Error", value: statusCount("error"), className: "bg-red-500" },
                ]}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Users by plan
              </p>
              <BreakdownBar
                items={[
                  { label: "Free", value: userStats?.free ?? 0, className: "bg-accent" },
                  { label: "Pro", value: userStats?.pro ?? 0, className: "bg-amber-500" },
                  {
                    label: "Enterprise",
                    value: userStats?.enterprise ?? 0,
                    className: "bg-violet-500",
                  },
                ]}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Accounts
              </p>
              <BreakdownBar
                items={[
                  { label: "Active", value: userStats?.active ?? 0, className: "bg-emerald-500" },
                  { label: "Pending", value: userStats?.pending ?? 0, className: "bg-amber-500" },
                  {
                    label: "Suspended",
                    value: userStats?.suspended ?? 0,
                    className: "bg-red-500",
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-elevated border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <UserPlus className="h-4 w-4 text-accent" aria-hidden />
              Recent signups
            </CardTitle>
            <Link href="/admin/users" className="text-sm text-accent hover:underline">
              All users
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentUsers.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">No users yet.</p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {recentUsers.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/admin/users?user=${u.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-surface-2/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {u.name ?? u.email}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {u.email} · joined {timeAgo(u.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!u.totpEnabled && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            No 2FA
                          </span>
                        )}
                        <Badge status={u.plan} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <ShieldAlert
                className={failed2fa > 0 ? "h-4 w-4 text-red-500" : "h-4 w-4 text-accent"}
                aria-hidden
              />
              Security alerts · 7 days
            </CardTitle>
            <Link href="/admin/audit?filter=auth" className="text-sm text-accent hover:underline">
              Audit log
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {alerts.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">
                No failed 2FA attempts, deletions, or GitHub removals this week.
              </p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {alerts.map((a) => {
                  const meta = metaFor(a.action);
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-6 py-3">
                      <meta.icon
                        className={
                          meta.tone === "danger"
                            ? "h-4 w-4 shrink-0 text-red-500"
                            : "h-4 w-4 shrink-0 text-muted"
                        }
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{meta.label}</p>
                        <p className="truncate text-xs text-muted">
                          <Link
                            href={`/admin/audit?user=${a.userId}`}
                            className="hover:text-ink hover:underline"
                          >
                            {a.email}
                          </Link>
                          {a.ip ? <span className="font-mono"> · {a.ip}</span> : null}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ProUpcomingBanner />
    </div>
  );
}
