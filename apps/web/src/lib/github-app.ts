import { createHmac, createPrivateKey, createSign, timingSafeEqual } from "crypto";
import type { GithubRepo } from "@/lib/github-repos";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function isGithubAppConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_APP_ID &&
      process.env.GITHUB_APP_PRIVATE_KEY &&
      process.env.GITHUB_APP_SLUG
  );
}

export function getGithubAppSlug(): string {
  return requireEnv("GITHUB_APP_SLUG");
}

function normalizePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("BEGIN")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  return Buffer.from(trimmed, "base64").toString("utf8");
}

/** Short-lived JWT to authenticate as the GitHub App. */
export function createGithubAppJwt(): string {
  const appId = requireEnv("GITHUB_APP_ID");
  const privateKey = normalizePrivateKey(requireEnv("GITHUB_APP_PRIVATE_KEY"));
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId,
    })
  ).toString("base64url");

  const data = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign(createPrivateKey(privateKey), "base64url");
  return `${data}.${signature}`;
}

export async function createInstallationAccessToken(
  installationId: string
): Promise<string> {
  const jwt = createGithubAppJwt();
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create GitHub installation token (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export type GithubInstallation = {
  id: number;
  account: { id: number; login: string; type: "User" | "Organization" | string } | null;
};

/** Look up an installation of this App; null when it does not exist. */
export async function getInstallation(
  installationId: string
): Promise<GithubInstallation | null> {
  const response = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(installationId)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${createGithubAppJwt()}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to look up GitHub App installation (${response.status})`);
  }
  return (await response.json()) as GithubInstallation;
}

export type InstallationOwnership =
  | { ok: true }
  | { ok: false; reason: "not_found" | "organization" | "not_owner" };

/**
 * The installation_id GitHub appends to the setup URL is caller-controlled, so
 * only bind installations on the personal account the user signed in with.
 */
export function checkInstallationOwnership(
  installation: GithubInstallation | null,
  githubUserId: string
): InstallationOwnership {
  if (!installation?.account) return { ok: false, reason: "not_found" };
  if (installation.account.type !== "User") {
    return { ok: false, reason: "organization" };
  }
  if (String(installation.account.id) !== githubUserId) {
    return { ok: false, reason: "not_owner" };
  }
  return { ok: true };
}

export function buildCloneUrl(
  owner: string,
  repo: string,
  installationToken: string
): string {
  return `https://x-access-token:${installationToken}@github.com/${owner}/${repo}.git`;
}

export type GithubContentEntry = {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  download_url?: string | null;
};

/** List a directory (or fetch a single file) via the GitHub Contents API. */
export async function githubContents(
  installationId: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<GithubContentEntry[] | GithubContentEntry | null> {
  const token = await createInstallationAccessToken(installationId);
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const url = new URL(
    `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`
  );
  if (ref) url.searchParams.set("ref", ref);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 0 },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `GitHub contents failed (${response.status}) for ${owner}/${repo}/${cleanPath}`
    );
  }

  return (await response.json()) as GithubContentEntry[] | GithubContentEntry;
}

/** Fetch raw file text from GitHub Contents API (file path). */
export async function githubFileText(
  installationId: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  const token = await createInstallationAccessToken(installationId);
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const url = new URL(
    `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`
  );
  if (ref) url.searchParams.set("ref", ref);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/vnd.github.raw+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 0 },
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;
  return response.text();
}

export async function listInstallationRepos(
  installationId: string
): Promise<GithubRepo[]> {
  const token = await createInstallationAccessToken(installationId);
  const repos: GithubRepo[] = [];
  let page = 1;

  while (page <= 10) {
    const response = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to list GitHub App installation repositories");
    }

    const data = (await response.json()) as {
      repositories: Array<{
        id: number;
        name: string;
        full_name: string;
        owner: { login: string };
        default_branch: string;
        private: boolean;
      }>;
      total_count: number;
    };

    for (const repo of data.repositories) {
      repos.push({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        defaultBranch: repo.default_branch,
        private: repo.private,
      });
    }

    if (repos.length >= data.total_count || data.repositories.length === 0) {
      break;
    }
    page += 1;
  }

  return repos.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** Signed state for install callback CSRF protection. */
export function createInstallState(userId: string): string {
  const secret = requireEnv("AUTH_SECRET");
  const exp = Math.floor(Date.now() / 1000) + 60 * 30;
  const body = `${userId}.${exp}`;
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyInstallState(state: string): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  if (!userId || !expStr || !sig) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const body = `${userId}.${expStr}`;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  return userId;
}

export function getGithubAppInstallUrl(userId: string): string {
  const slug = getGithubAppSlug();
  const state = createInstallState(userId);
  return `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`;
}

export function getGithubAppConfigureUrl(installationId: string): string {
  const slug = getGithubAppSlug();
  return `https://github.com/apps/${slug}/installations/${installationId}`;
}

export function verifyGithubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret || !signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected =
    "sha256=" +
    createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
