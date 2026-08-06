import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { verifyInstallState } from "@/lib/github-app";

function appUrl(path: string): URL {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(appUrl("/login"));
  }

  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");
  const state = searchParams.get("state");

  if (!installationId) {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_missing_installation")
    );
  }

  // Prefer signed state; fall back to current session if GitHub omitted state
  const stateUserId = state ? verifyInstallState(state) : null;
  if (state && !stateUserId) {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_invalid_state")
    );
  }

  const userId = stateUserId ?? session.user.id;
  if (userId !== session.user.id) {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_wrong_user")
    );
  }

  if (setupAction === "request") {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_request_pending")
    );
  }

  await db
    .update(users)
    .set({
      githubInstallationId: installationId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const redirectTo = appUrl("/dashboard/apps/new");
  redirectTo.searchParams.set("github_app", "installed");
  return NextResponse.redirect(redirectTo);
}
