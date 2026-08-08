import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { apps, deployments } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPlanConfig, normalizePlan } from "@/lib/plans";
import { getAppPublicUrl } from "@/lib/dokploy";

function timeAgo(date: Date | null): string {
  if (!date) return "N/A";
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function AppsListPage() {
  const session = await requireAuth();

  const userApps = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, session.user.id));

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
  const appCount = userApps.length;
  const runningCount = userApps.filter((a) => a.status === "running").length;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Apps"
        description={`${planConfig.name} plan · ${appCount}/${planConfig.maxApps} apps · ${runningCount} running`}
        action={
          <Link href="/dashboard/apps/new">
            <Button variant="accent" className="btn-glow">New App</Button>
          </Link>
        }
      />

      {userApps.length === 0 ? (
        <Card className="card-lift mt-10 border-dashed border-border bg-surface/50">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <p className="font-mono text-sm text-accent">$ hostingit deploy</p>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">
              No apps yet
            </h2>
            <p className="mt-2 max-w-sm text-muted">
              Deploy your first app from GitHub in a few clicks. One repo, one URL
              with SSL.
            </p>
            <Link href="/dashboard/apps/new" className="mt-6">
              <Button size="lg" variant="accent" className="btn-glow">
                Create your first app
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-8 space-y-3">
          {userApps.map((app, i) => (
            <li
              key={app.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Link href={`/dashboard/apps/${app.id}`} className="block">
                <Card className="card-lift card-elevated border-border bg-surface">
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg font-semibold text-ink">
                        {app.name}
                      </h3>
                      <p className="mt-1 truncate text-sm text-muted">
                        {app.githubOwner}/{app.githubRepo} · {app.githubBranch}
                      </p>
                      <p className="mt-1 truncate font-mono text-sm text-accent">
                        {getAppPublicUrl(app)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge status={app.status} />
                      <span className="text-xs text-muted">
                        {lastDeployMap.get(app.id)
                          ? `Deployed ${timeAgo(lastDeployMap.get(app.id)!)}`
                          : "Not deployed yet"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
