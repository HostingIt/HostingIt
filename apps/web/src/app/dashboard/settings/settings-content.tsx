import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  getGithubAppConfigureUrl,
  isGithubAppConfigured,
} from "@/lib/github-app";
import { SettingsClient } from "./settings-client";
import { resolveAvatarSrc } from "@/lib/avatar";

export default async function SettingsPageContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; github_app?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  const [user] = await db
    .select({
      email: users.email,
      name: users.name,
      githubId: users.githubId,
      googleId: users.googleId,
      totpEnabled: users.totpEnabled,
      githubInstallationId: users.githubInstallationId,
      avatarUpdatedAt: users.avatarUpdatedAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const errorMessages: Record<string, string> = {
    provider_in_use: "That provider is already linked to another account.",
    github_app_missing_installation: "GitHub did not return an installation id.",
    github_app_invalid_state: "Install link expired. Try installing again.",
    github_app_wrong_user: "Install was started by a different account.",
    github_app_request_pending:
      "Repo access was requested from an org admin. Try again after approval.",
    github_app_link_github:
      "Connect your GitHub account on this page before installing the GitHub App.",
    github_app_not_found: "That GitHub App installation could not be found.",
    github_app_organization:
      "Organization installs aren't supported yet. Install the app on your personal GitHub account.",
    github_app_not_owner:
      "That installation belongs to a different GitHub account than the one linked here.",
    github_app_verify_failed:
      "Couldn't verify the installation with GitHub. Try again in a moment.",
  };

  const linkError = params.error
    ? (errorMessages[params.error] ?? null)
    : null;

  const flash =
    params.github_app === "installed"
      ? "GitHub App installed. You can deploy granted repositories."
      : null;

  if (!user) {
    return null;
  }

  return (
    <SettingsClient
      profile={{
        email: user.email,
        name: user.name,
        avatarSrc: resolveAvatarSrc({
          email: user.email,
          avatarUpdatedAt: user.avatarUpdatedAt,
        }),
        hasCustomAvatar: Boolean(user.avatarUpdatedAt),
        totpEnabled: user.totpEnabled,
        githubAppInstalled: !!user.githubInstallationId,
        githubAppConfigureUrl: user.githubInstallationId
          ? getGithubAppConfigureUrl(user.githubInstallationId)
          : null,
        githubAppReady: isGithubAppConfigured(),
        providers: {
          github: !!user.githubId,
          google: !!user.googleId,
        },
      }}
      linkError={linkError}
      flash={flash}
    />
  );
}
