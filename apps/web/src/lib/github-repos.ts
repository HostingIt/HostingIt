import { unstable_cache } from "next/cache";

export interface GithubRepo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
}

async function fetchGithubRepos(token: string): Promise<GithubRepo[]> {
  const response = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      next: { revalidate: 120 },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch repositories");
  }

  const repos = (await response.json()) as Array<{
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    default_branch: string;
    private: boolean;
  }>;

  return repos.map((repo) => ({
    id: repo.id.toString(),
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    defaultBranch: repo.default_branch,
    private: repo.private,
  }));
}

export function getCachedGithubRepos(userId: string, token: string) {
  return unstable_cache(
    () => fetchGithubRepos(token),
    [`github-repos-${userId}`],
    { revalidate: 120, tags: [`github-repos-${userId}`] }
  )();
}
