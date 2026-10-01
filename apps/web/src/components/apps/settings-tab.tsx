"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { App } from "@/db/schema";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectDropdown } from "@/components/ui/select-dropdown";

const BUILD_TYPES = [
  { value: "nixpacks", label: "Auto-detect (Nixpacks)" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "static", label: "Static site" },
  { value: "railpack", label: "Railpack" },
];

type Settings = {
  githubBranch: string;
  buildPath: string;
  buildType: string;
  autoDeploy: boolean;
  dockerfile: string;
  dockerContextPath: string;
  dockerBuildStage: string;
  publishDirectory: string;
  isStaticSpa: boolean;
  containerPort: number;
};

interface SettingsTabProps {
  app: App;
  url: string;
  onChanged: () => void | Promise<void>;
}

export function SettingsTab({ app, onChanged }: SettingsTabProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [domainVerification, setDomainVerification] = useState<{
    name: string;
    value: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${app.id}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          githubBranch: data.githubBranch ?? app.githubBranch,
          buildPath: data.buildPath ?? "/",
          buildType: data.buildType ?? "nixpacks",
          autoDeploy: data.autoDeploy ?? true,
          dockerfile: data.dockerfile ?? "Dockerfile",
          dockerContextPath: data.dockerContextPath ?? ".",
          dockerBuildStage: data.dockerBuildStage ?? "",
          publishDirectory: data.publishDirectory ?? "dist",
          isStaticSpa: data.isStaticSpa ?? false,
          containerPort: data.containerPort ?? 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [app.id, app.githubBranch]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(redeploy: boolean) {
    if (!settings) return;
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch(`/api/apps/${app.id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, redeploy }),
    });
    if (response.ok) {
      setMessage(redeploy ? "Settings saved and redeploy started." : "Settings saved.");
      await onChanged();
    } else {
      const data = await response.json();
      setError(data.error ?? "Failed to save settings");
    }
    setSaving(false);
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/apps/${app.id}/domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: customDomain }),
    });
    if (response.ok) {
      setCustomDomain("");
      setDomainVerification(null);
      await onChanged();
    } else {
      const data = await response.json();
      setError(data.error ?? "Failed to add domain");
      setDomainVerification(data.verification ?? null);
    }
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    setConfirmDelete(false);
    await fetch(`/api/apps/${app.id}`, { method: "DELETE" });
    router.push("/dashboard/apps");
  }

  if (loading || !settings) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton skeleton-text h-40 w-full rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <Alert variant={error ? "error" : "success"}>{error || message}</Alert>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Source & deploy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                value={settings.githubBranch}
                onChange={(e) => setSettings({ ...settings, githubBranch: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildPath">Root directory</Label>
              <Input
                id="buildPath"
                value={settings.buildPath}
                onChange={(e) => setSettings({ ...settings, buildPath: e.target.value })}
                placeholder="/ or apps/web"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={settings.autoDeploy}
              onChange={(e) => setSettings({ ...settings, autoDeploy: e.target.checked })}
              className="rounded border-border"
            />
            Auto-deploy on push to branch
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={saving} onClick={() => save(false)}>
              Save
            </Button>
            <Button
              disabled={saving}
              onClick={() => save(true)}
              variant="accent"
            >
              Save & redeploy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Build</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted">
            One HostingIt app = one container. For repos with{" "}
            <span className="font-mono">frontend/</span> and{" "}
            <span className="font-mono">backend/</span>, set Root directory to the
            folder you want online. Use Dockerfile if auto-detect fails.
          </p>
          <div className="space-y-2">
            <Label htmlFor="containerPort">Container port</Label>
            <Input
              id="containerPort"
              type="number"
              min={1}
              max={65535}
              value={settings.containerPort}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  containerPort: Number.parseInt(e.target.value, 10) || 3000,
                })
              }
            />
            <p className="text-xs text-muted">
              Traefik routes your domain to this port inside the container.
              Detected from <span className="font-mono">PORT</span> or{" "}
              <span className="font-mono">EXPOSE</span> when possible.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Build type</Label>
            <SelectDropdown
              label="Build type"
              value={settings.buildType}
              options={BUILD_TYPES}
              onChange={(buildType) => setSettings({ ...settings, buildType })}
            />
          </div>

          {settings.buildType === "dockerfile" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dockerfile">Dockerfile path</Label>
                <Input
                  id="dockerfile"
                  value={settings.dockerfile}
                  onChange={(e) => setSettings({ ...settings, dockerfile: e.target.value })}
                  placeholder="Dockerfile or docker/Dockerfile"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dockerContext">Docker context</Label>
                <Input
                  id="dockerContext"
                  value={settings.dockerContextPath}
                  onChange={(e) =>
                    setSettings({ ...settings, dockerContextPath: e.target.value })
                  }
                  placeholder="."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="dockerBuildStage">Build stage</Label>
                <Input
                  id="dockerBuildStage"
                  value={settings.dockerBuildStage}
                  onChange={(e) =>
                    setSettings({ ...settings, dockerBuildStage: e.target.value })
                  }
                  placeholder="runner (optional multi-stage target)"
                />
                <p className="text-xs text-muted">
                  For multi-stage Dockerfiles, leave blank for the last stage or set
                  e.g. runner / production.
                </p>
              </div>
            </div>
          )}

          {settings.buildType === "static" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="publishDirectory">Output directory</Label>
                <Input
                  id="publishDirectory"
                  value={settings.publishDirectory}
                  onChange={(e) =>
                    setSettings({ ...settings, publishDirectory: e.target.value })
                  }
                  placeholder="dist"
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={settings.isStaticSpa}
                  onChange={(e) =>
                    setSettings({ ...settings, isStaticSpa: e.target.checked })
                  }
                  className="rounded border-border"
                />
                Single-page app (client-side routing)
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Custom domain</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addDomain} className="flex gap-2">
            <Input
              value={customDomain}
              onChange={(e) => {
                setCustomDomain(e.target.value);
                setDomainVerification(null);
              }}
              placeholder="app.example.com"
            />
            <Button type="submit" disabled={saving || !customDomain}>
              Add
            </Button>
          </form>
          {domainVerification && (
            <div className="mt-3 space-y-1 rounded-md border border-border p-3 text-sm">
              <p className="font-medium">Add this TXT record at your DNS provider:</p>
              <p className="break-all font-mono text-xs">
                Name: {domainVerification.name}
              </p>
              <p className="break-all font-mono text-xs">
                Value: {domainVerification.value}
              </p>
              <p className="text-muted">
                DNS changes can take a few minutes. Click Add again once it&apos;s live.
              </p>
            </div>
          )}
          <p className="mt-2 text-sm text-muted">
            Custom domains arrive with the Pro plan (upcoming). Point your domain
            CNAME to your app subdomain, and verify ownership with the TXT record
            we show you.
          </p>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-500/30">
        <CardHeader>
          <CardTitle className="font-display text-lg text-red-700 dark:text-red-400">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted">
            Permanently delete this app and its deployments.
          </p>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
          >
            Delete app
          </Button>
        </CardContent>
      </Card>

      <ConfirmModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this app?"
        description="This permanently removes the app and its deployments. It cannot be undone."
        confirmLabel="Delete app"
        busy={saving}
        onConfirm={handleDelete}
      />
    </div>
  );
}
