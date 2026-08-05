"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Repo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
}

export default function NewAppPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/github/repos")
      .then((res) => res.json())
      .then((data) => {
        setConnected(data.connected ?? false);
        setRepos(data.repos ?? []);
      })
      .catch(() => setConnected(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRepo) return;

    setLoading(true);
    setError("");

    const response = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        githubOwner: selectedRepo.owner,
        githubRepo: selectedRepo.name,
        githubBranch: branch,
        githubId: selectedRepo.id,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to create app");
      return;
    }

    router.push(`/dashboard/apps/${data.app.id}`);
  }

  if (connected === null) {
    return <p className="text-zinc-600">Loading repositories...</p>;
  }

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect GitHub</CardTitle>
          <CardDescription>
            Sign in with GitHub or connect your account to list repositories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={async () => {
              const { signIn } = await import("next-auth/react");
              await signIn("github", { callbackUrl: "/dashboard/apps/new" });
            }}
          >
            Connect GitHub
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">New App</h1>
      <p className="mt-1 text-zinc-600">Deploy a GitHub repository</p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-6">
        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">App name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-portfolio"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Repository</Label>
          <select
            className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
            value={selectedRepo?.fullName ?? ""}
            onChange={(e) => {
              const repo = repos.find((r) => r.fullName === e.target.value);
              setSelectedRepo(repo ?? null);
              if (repo) setBranch(repo.defaultBranch);
            }}
            required
          >
            <option value="">Select a repository</option>
            {repos.map((repo) => (
              <option key={repo.id} value={repo.fullName}>
                {repo.fullName} {repo.private ? "(private)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          <Input
            id="branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            required
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading || !selectedRepo}>
            {loading ? "Creating..." : "Deploy app"}
          </Button>
          <Link href="/dashboard">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
