import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCachedGithubRepos } from "@/lib/github-repos";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ githubAccessToken: users.githubAccessToken })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.githubAccessToken) {
    return NextResponse.json(
      { error: "GitHub not connected", connected: false },
      { status: 400 }
    );
  }

  try {
    const repos = await getCachedGithubRepos(
      session.user.id,
      user.githubAccessToken
    );
    return NextResponse.json({ connected: true, repos });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 502 }
    );
  }
}
