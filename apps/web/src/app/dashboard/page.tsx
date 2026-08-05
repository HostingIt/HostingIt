import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, type Plan } from "@/lib/plans";
import { getAppUrl } from "@/lib/dokploy";

export default async function DashboardPage() {
  const session = await requireAuth();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const userApps = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, session.user.id));

  const plan = (user?.plan ?? "free") as Plan;
  const planConfig = PLANS[plan];
  const appCount = userApps.length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-zinc-600">
            {planConfig.name} plan · {appCount}/{planConfig.maxApps} apps
          </p>
        </div>
        <Link href="/dashboard/apps/new">
          <Button>New App</Button>
        </Link>
      </div>

      {userApps.length === 0 ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>No apps yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600">
              Deploy your first app from GitHub in a few clicks.
            </p>
            <Link href="/dashboard/apps/new" className="mt-4 inline-block">
              <Button>Create your first app</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4">
          {userApps.map((app) => (
            <Link key={app.id} href={`/dashboard/apps/${app.id}`}>
              <Card className="transition hover:border-zinc-400">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="font-semibold">{app.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {app.githubOwner}/{app.githubRepo} · {app.githubBranch}
                    </p>
                    <p className="mt-1 text-sm text-blue-600">
                      {getAppUrl(app.slug)}
                    </p>
                  </div>
                  <Badge status={app.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
