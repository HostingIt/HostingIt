import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { analyzeRepo } from "@/lib/repo-analyze";
import { toClientError } from "@/lib/safe-error";
import { requireApiUser } from "@/lib/api-auth";

const querySchema = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(200),
  branch: z.string().min(1).max(256).default("main"),
});

export async function GET(request: Request) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    owner: searchParams.get("owner") ?? "",
    repo: searchParams.get("repo") ?? "",
    branch: searchParams.get("branch") ?? "main",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select({ githubInstallationId: users.githubInstallationId })
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user?.githubInstallationId) {
    return NextResponse.json(
      { error: "GitHub App is not installed" },
      { status: 403 }
    );
  }

  try {
    const result = await analyzeRepo({
      installationId: user.githubInstallationId,
      owner: parsed.data.owner,
      repo: parsed.data.repo,
      branch: parsed.data.branch,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Repo analyze error:", error);
    return NextResponse.json(
      {
        error:
          toClientError(error, "Failed to analyze repository"),
      },
      { status: 502 }
    );
  }
}
