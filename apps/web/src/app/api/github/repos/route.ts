import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { listInstallationRepos, isGithubAppConfigured } from "@/lib/github-app";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGithubAppConfigured()) {
    return NextResponse.json(
      { error: "GitHub App is not configured" },
      { status: 503 }
    );
  }

  const [user] = await db
    .select({ githubInstallationId: users.githubInstallationId })
    .from(users)
    .where(eq(users.id, session.user.id))
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
