"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AppData {
  id: string;
  name: string;
  slug: string;
  status: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  subdomain: string;
  customDomain: string | null;
}

export default function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [appId, setAppId] = useState<string>("");
  const [app, setApp] = useState<AppData | null>(null);
  const [url, setUrl] = useState("");
  const [logs, setLogs] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApp = useCallback(async (id: string) => {
    const response = await fetch(`/api/apps/${id}`);
    if (!response.ok) {
      router.push("/dashboard");
      return;
    }
    const data = await response.json();
    setApp(data.app);
    setUrl(data.url);
    setLogs(data.logs);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    params.then(({ id }) => {
      setAppId(id);
      fetchApp(id);
    });
  }, [params, fetchApp]);

  async function handleRedeploy() {
    setActionLoading(true);
    await fetch(`/api/apps/${appId}/redeploy`, { method: "POST" });
    await fetchApp(appId);
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this app? This cannot be undone.")) return;
    setActionLoading(true);
    await fetch(`/api/apps/${appId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const response = await fetch(`/api/apps/${appId}/domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: customDomain }),
    });
    if (response.ok) {
      await fetchApp(appId);
      setCustomDomain("");
    }
    setActionLoading(false);
  }

  if (loading || !app) {
    return <p className="text-zinc-600">Loading app...</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
            ← Back to apps
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{app.name}</h1>
          <p className="mt-1 text-zinc-600">
            {app.githubOwner}/{app.githubRepo} · {app.githubBranch}
          </p>
        </div>
        <Badge status={app.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {url}
            </a>
            {app.customDomain && (
              <p className="text-sm text-zinc-600">
                Custom: {app.customDomain}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleRedeploy}
              disabled={actionLoading}
            >
              Redeploy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              Delete
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Custom domain</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="flex gap-2">
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="app.example.com"
            />
            <Button type="submit" disabled={actionLoading || !customDomain}>
              Add
            </Button>
          </form>
          <p className="mt-2 text-sm text-zinc-500">
            Requires Starter plan or higher. Point your domain CNAME to your app subdomain.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-md bg-zinc-900 p-4 text-xs text-zinc-100">
            {logs || "No logs available yet."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
