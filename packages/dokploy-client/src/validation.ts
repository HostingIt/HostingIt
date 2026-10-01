/**
 * Dokploy trusts its callers: it joins build settings into filesystem paths
 * under the shared applications directory and places several of them on the
 * build command line. HostingIt forwards tenant input, so every value that
 * reaches a build must be checked here first.
 */

const SAFE_PATH_RE = /^[A-Za-z0-9._/-]+$/;
const BUILD_STAGE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const GITHUB_OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const GITHUB_REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
const MAX_PATH_LENGTH = 256;
const MAX_BRANCH_LENGTH = 255;

/** Repo-relative path: plain characters only and no `..` segment. */
export function isSafeRepoPath(value: string): boolean {
  if (value.length === 0 || value.length > MAX_PATH_LENGTH) return false;
  if (!SAFE_PATH_RE.test(value)) return false;
  return !value.split("/").some((segment) => segment === "..");
}

/** Docker build stage (`--target`) name. */
export function isSafeBuildStage(value: string): boolean {
  return BUILD_STAGE_RE.test(value);
}

export function isValidGithubOwner(value: string): boolean {
  return GITHUB_OWNER_RE.test(value);
}

export function isValidGithubRepo(value: string): boolean {
  return GITHUB_REPO_RE.test(value) && value !== "." && value !== "..";
}

/** Branch name per `git check-ref-format`, minus anything shell-significant. */
export function isValidGitBranch(value: string): boolean {
  if (value.length === 0 || value.length > MAX_BRANCH_LENGTH) return false;
  if (!/^[A-Za-z0-9._/+-]+$/.test(value)) return false;
  if (value.startsWith("-") || value.startsWith("/") || value.startsWith(".")) {
    return false;
  }
  if (value.endsWith("/") || value.endsWith(".") || value.endsWith(".lock")) {
    return false;
  }
  if (value.includes("..") || value.includes("//") || value.includes("/.")) {
    return false;
  }
  return true;
}

export interface BuildConfigFields {
  buildPath?: string | null;
  customGitBuildPath?: string | null;
  dockerfile?: string | null;
  dockerContextPath?: string | null;
  dockerBuildStage?: string | null;
  publishDirectory?: string | null;
}

/** Name of the first unsafe build setting, or null when all are safe. */
export function findUnsafeBuildField(
  config: BuildConfigFields
): keyof BuildConfigFields | null {
  const paths = [
    "buildPath",
    "customGitBuildPath",
    "dockerfile",
    "dockerContextPath",
    "publishDirectory",
  ] as const;
  for (const field of paths) {
    const value = config[field];
    if (value != null && value !== "" && !isSafeRepoPath(value)) return field;
  }
  const stage = config.dockerBuildStage;
  if (stage != null && stage !== "" && !isSafeBuildStage(stage)) {
    return "dockerBuildStage";
  }
  return null;
}
