import { getDokployClient } from "@/lib/dokploy";
import {
  buildCloneUrl,
  createInstallationAccessToken,
} from "@/lib/github-app";

/**
 * Point a Dokploy app at a user's repo using a short-lived GitHub App
 * installation token. Call before every deploy/redeploy (tokens expire ~1h).
 */
export async function syncDokployGitSource(input: {
  dokployAppId: string;
  installationId: string;
  owner: string;
  repo: string;
  branch: string;
  buildPath?: string;
}): Promise<void> {
  const token = await createInstallationAccessToken(input.installationId);
  const buildPath = input.buildPath?.startsWith("/")
    ? input.buildPath
    : `/${input.buildPath ?? ""}`.replace(/\/+/g, "/") || "/";

  await getDokployClient().saveGitProvider({
    applicationId: input.dokployAppId,
    customGitUrl: buildCloneUrl(input.owner, input.repo, token),
    customGitBranch: input.branch,
    customGitBuildPath: buildPath === "//" ? "/" : buildPath,
  });
}
