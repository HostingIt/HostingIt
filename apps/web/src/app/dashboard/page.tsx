import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { apps, deployments } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPlanConfig, normalizePlan } from "@/lib/plans";
import { getAppPublicUrl } from "@/lib/dokploy";
import { deploymentStatusForBadge } from "@/lib/deployments";

function timeAgo(date: Date | null): string {
  if (!date) return "N/A";
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardOverviewPage() {
  const session = await requireAuth();

  const userApps = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, session.user.id));

  const appIds = userApps.map((a) => a.id);
  const appById = new Map(userApps.map((a) => [a.id, a]));

  const recentDeployments =
    appIds.length > 0
      ? await db
          .select()
          .from(deployments)
          .where(inArray(deployments.appId, appIds))
          .orderBy(desc(deployments.startedAt))
          .limit(5)
      : [];

  const lastDeploys = await Promise.all(
    userApps.map(async (app) => {
      const [latest] = await db
        .select({ startedAt: deployments.startedAt })
        .from(deployments)
        .where(eq(deployments.appId, app.id))
        .orderBy(desc(deployments.startedAt))
        .limit(1);
      return { appId: app.id, startedAt: latest?.startedAt ?? null };
    })
  );
  const lastDeployMap = new Map(lastDeploys.map((d) => [d.appId, d.startedAt]));

  const plan = normalizePlan(session.user.plan ?? "free");
  const planConfig = getPlanConfig(plan);
  const runningCount = userApps.filter((a) => a.status === "running").length;
  const deployingCount = userApps.filter(
    (a) => a.status === "deploying" || a.status === "creating"
  ).length;
  const stoppedCount = userApps.filter((a) => a.status === "stopped").length;

  const stats = [
    { label: "Total apps", value: userApps.length },
    { label: "Running", value: runningCount },
    { label: "Deploying", value: deployingCount },
    {
      label: "Plan usage",
      value: `${userApps.length}/${planConfig.maxApps}`,
    },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Overview of your ${planConfig.name} workspace`}
        action={
          <Link href="/dashboard/apps/new">
            <Button variant="accent" className="btn-glow">New App</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="card-elevated border-border">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {stat.label}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">Apps</h2>
          {userApps.length > 0 && (
            <Link
              href="/dashboard/apps"
              className="text-sm text-accent hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {userApps.length === 0 ? (
          <Card className="border-dashed border-border bg-surface/50">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <p className="font-mono text-sm text-accent">$ hostingit deploy</p>
              <h3 className="mt-4 font-display text-xl font-bold text-ink">
                No apps yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Connect GitHub and deploy your first app to see it here.
              </p>
              <Link href="/dashboard/apps/new" className="mt-6">
                <Button variant="accent" className="btn-glow">
                  Create your first app
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userApps.slice(0, 6).map((app) => (
              <Link key={app.id} href={`/dashboard/apps/${app.id}`}>
                <Card className="card-lift card-elevated h-full border-border bg-surface">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-display text-lg font-semibold text-ink">
                        {app.name}
                      </h3>
                      <Badge status={app.status} />
                    </div>
                    <p className="mt-2 truncate text-sm text-muted">
                      {app.githubOwner}/{app.githubRepo}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-accent">
                      {getAppPublicUrl(app)}
                    </p>
                    <p className="mt-auto pt-4 text-xs text-muted">
                      {lastDeployMap.get(app.id)
                        ? `Deployed ${timeAgo(lastDeployMap.get(app.id)!)}`
                        : "Not deployed yet"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {recentDeployments.length > 0 && (
        <section>
          <Card className="card-elevated border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {recentDeployments.map((d) => {
                const app = appById.get(d.appId);
                if (!app) return null;
                return (
                  <Link
                    key={d.id}
                    href={`/dashboard/apps/${app.id}?tab=deployments`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {app.name}
                      </p>
                      <p className="text-xs text-muted">
                        Deployment · {timeAgo(d.startedAt)}
                      </p>
                    </div>
                    <Badge status={deploymentStatusForBadge(d.status)} />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}

      {stoppedCount > 0 && (
        <p className="text-sm text-muted">
          {stoppedCount} app{stoppedCount === 1 ? "" : "s"} stopped. Open Apps
          to start or redeploy.
        </p>
      )}
    </div>
  );
}
