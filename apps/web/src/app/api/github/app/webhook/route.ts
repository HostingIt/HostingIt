import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { verifyGithubWebhookSignature } from "@/lib/github-app";
import { syncDokployGitSource } from "@/lib/deploy-git";
import { getDokployClient } from "@/lib/dokploy";
import { applyPlanResourceLimits } from "@/lib/app-resources";
import { syncDeploymentsFromDokploy } from "@/lib/deployments";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyGithubWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  const payload = JSON.parse(rawBody) as Record<string, unknown>;

  try {
    if (event === "installation") {
      const action = payload.action as string;
      const installation = payload.installation as { id: number };
      const installationId = String(installation.id);

      if (action === "deleted" || action === "suspend") {
        await db
          .update(users)
          .set({ githubInstallationId: null, updatedAt: new Date() })
          .where(eq(users.githubInstallationId, installationId));
      }
    }

    if (event === "installation_repositories") {
      // Repo access changed — nothing required; next list/deploy uses current grants
    }

    if (event === "push") {
      const repository = payload.repository as {
        name: string;
        owner: { login: string };
      };
      const ref = payload.ref as string; // refs/heads/main
      if (!ref?.startsWith("refs/heads/")) {
        return NextResponse.json({ ok: true });
      }

      const branch = ref.replace("refs/heads/", "");
      const owner = repository.owner.login;
      const repo = repository.name;

      const matching = await db
        .select({
          app: apps,
          installationId: users.githubInstallationId,
          plan: users.plan,
        })
        .from(apps)
        .innerJoin(users, eq(users.id, apps.userId))
        .where(
          and(
            eq(apps.githubOwner, owner),
            eq(apps.githubRepo, repo),
            eq(apps.githubBranch, branch)
          )
        );

      const dokploy = getDokployClient();

      for (const row of matching) {
        if (!row.installationId) continue;
        try {
          const remote = await dokploy.getApplication(row.app.dokployAppId);
          await applyPlanResourceLimits(
            dokploy,
            row.app.dokployAppId,
            row.plan
          );
          await syncDokployGitSource({
            dokployAppId: row.app.dokployAppId,
            installationId: row.installationId,
            owner: row.app.githubOwner,
            repo: row.app.githubRepo,
            branch: row.app.githubBranch,
            buildPath: remote.customGitBuildPath ?? remote.buildPath ?? "/",
          });
          await dokploy.redeploy(row.app.dokployAppId);
          await db
            .update(apps)
            .set({ status: "deploying", updatedAt: new Date() })
            .where(eq(apps.id, row.app.id));
          await syncDeploymentsFromDokploy(
            dokploy,
            row.app.id,
            row.app.dokployAppId
          );
        } catch (error) {
          console.error("Webhook redeploy failed:", row.app.id, error);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GitHub App webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
