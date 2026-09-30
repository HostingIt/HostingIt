import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { listInstallationRepos, isGithubAppConfigured } from "@/lib/github-app";
import { requireApiUser } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  if (!isGithubAppConfigured()) {
    return NextResponse.json(
      { error: "GitHub App is not configured" },
      { status: 503 }
    );
  }

  const [user] = await db
    .select({ githubInstallationId: users.githubInstallationId })
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user?.githubInstallationId) {
    return NextResponse.json(
      { error: "GitHub App is not installed", connected: false },
      { status: 400 }
    );
  }

  try {
    const repos = await listInstallationRepos(user.githubInstallationId);
    return NextResponse.json({ connected: true, repos });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 502 }
    );
  }
}
