import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import {
  checkInstallationOwnership,
  getInstallation,
  verifyInstallState,
  type InstallationOwnership,
} from "@/lib/github-app";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";

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

  if (!installationId || !/^\d+$/.test(installationId)) {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_missing_installation")
    );
  }

  // Require signed state — never bind installations from a bare query param
  if (!state) {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_missing_state")
    );
  }

  const stateUserId = verifyInstallState(state);
  if (!stateUserId) {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_invalid_state")
    );
  }

  if (stateUserId !== session.user.id) {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_wrong_user")
    );
  }

  if (setupAction === "request") {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_request_pending")
    );
  }

  const [user] = await db
    .select({ githubId: users.githubId, accountStatus: users.accountStatus })
    .from(users)
    .where(eq(users.id, stateUserId))
    .limit(1);

  if (user?.accountStatus === "suspended") {
    return NextResponse.redirect(appUrl("/login?error=suspended"));
  }

  if (!user?.githubId) {
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_link_github")
    );
  }

  let ownership: InstallationOwnership;
  try {
    ownership = checkInstallationOwnership(
      await getInstallation(installationId),
      user.githubId
    );
  } catch (error) {
    console.error("GitHub App installation lookup failed:", error);
    return NextResponse.redirect(
      appUrl("/dashboard/settings?error=github_app_verify_failed")
    );
  }

  if (!ownership.ok) {
    return NextResponse.redirect(
      appUrl(`/dashboard/settings?error=github_app_${ownership.reason}`)
    );
  }

  await db
    .update(users)
    .set({
      githubInstallationId: installationId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, stateUserId));

  recordAuditEvent({
    userId: stateUserId,
    action: AUDIT_ACTIONS.githubInstall,
    request,
    metadata: { installationId },
  });

  const redirectTo = appUrl("/dashboard/apps/new");
  redirectTo.searchParams.set("github_app", "installed");
  return NextResponse.redirect(redirectTo);
}
