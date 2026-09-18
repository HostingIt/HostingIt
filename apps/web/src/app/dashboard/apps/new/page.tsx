import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { canCreateApp, formatAppQuota, getEffectiveAppLimit } from "@/lib/plans";
import {
  getGithubAppConfigureUrl,
  isGithubAppConfigured,
  listInstallationRepos,
} from "@/lib/github-app";
import type { GithubRepo } from "@/lib/github-repos";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewAppForm } from "./new-app-form";
import { ConnectGithubPrompt } from "./connect-github";

async function loadRepos(installationId: string): Promise<GithubRepo[] | null> {
  try {
    return await listInstallationRepos(installationId);
  } catch (error) {
    console.error("Failed to list installation repos:", error);
    return null;
  }
}

export default async function NewAppPage() {
  const session = await requireAuth();
  const appConfigured = isGithubAppConfigured();

  const [user] = await db
    .select({
      githubInstallationId: users.githubInstallationId,
      role: users.role,
      email: users.email,
      plan: users.plan,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (user) {
    const [{ value: appCount }] = await db
      .select({ value: count() })
      .from(apps)
      .where(eq(apps.userId, session.user.id));
    const appLimit = getEffectiveAppLimit(user);
    if (!canCreateApp(appCount, appLimit)) {
      return (
        <div className="animate-fade-up">
          <Card className="border-dashed border-border bg-surface/50">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                App limit reached
              </CardTitle>
              <CardDescription>
                You are using {formatAppQuota(appCount, appLimit)} apps on your
                current plan. Delete an app or upgrade to deploy another.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/apps">View apps</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (!user?.githubInstallationId) {
    return <ConnectGithubPrompt appConfigured={appConfigured} />;
  }

  const repos = await loadRepos(user.githubInstallationId);

  if (!repos) {
    return <ConnectGithubPrompt appConfigured={appConfigured} />;
  }

  if (repos.length === 0) {
    const configureUrl = getGithubAppConfigureUrl(user.githubInstallationId);
    return (
      <div className="animate-fade-up">
        <Card className="border-dashed border-border bg-surface/50">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              No repositories granted
            </CardTitle>
            <CardDescription>
              The GitHub App is installed, but no repos are selected. Grant
              access to the repos you want to deploy.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={configureUrl} target="_blank" rel="noopener noreferrer">
                Configure repo access
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings">Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <NewAppForm repos={repos} />;
}
