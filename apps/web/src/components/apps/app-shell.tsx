"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AppControls } from "@/components/apps/app-controls";
import { DeploymentsTab } from "@/components/apps/deployments-tab";
import { LogsTab } from "@/components/apps/logs-tab";
import { VariablesTab } from "@/components/apps/variables-tab";
import { MetricsTab } from "@/components/apps/metrics-tab";
import { SettingsTab } from "@/components/apps/settings-tab";
import type { App } from "@/db/schema";

const TABS = [
  { id: "deployments", label: "Deployments" },
  { id: "logs", label: "Logs" },
  { id: "variables", label: "Variables" },
  { id: "metrics", label: "Metrics" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface AppShellProps {
  app: App;
  url: string;
}

export function AppShell({ app: initialApp, url }: AppShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam)
    ? (tabParam as TabId)
    : "deployments";

  const [app, setApp] = useState(initialApp);

  const refreshApp = useCallback(async () => {
    const res = await fetch(`/api/apps/${app.id}/status`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.app) {
        setApp((prev) => ({ ...prev, ...data.app }));
      }
      router.refresh();
    }
  }, [app.id, router]);

  useEffect(() => {
    const isDeploying =
      app.status === "deploying" || app.status === "creating";
    if (!isDeploying) return;
    const t = setInterval(refreshApp, 5000);
    return () => clearInterval(t);
  }, [app.status, refreshApp]);

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="card-elevated rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard/apps"
              className="font-mono text-sm text-muted hover:text-ink"
            >
              ← apps
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                {app.name}
              </h1>
              <Badge status={app.status} />
            </div>
            <p className="mt-2 text-sm text-muted">
              {app.githubOwner}/{app.githubRepo} · {app.githubBranch}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-mono text-sm text-accent hover:underline"
            >
              {url}
            </a>
          </div>
        </div>

        {/* Controls */}
        <AppControls app={app} onChanged={refreshApp} />
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="App sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-accent text-ink"
                  : "border-transparent text-muted hover:border-border hover:text-ink"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab panels */}
      <div key={activeTab} className="animate-panel mt-6">
        {activeTab === "deployments" && (
          <DeploymentsTab
            appId={app.id}
            githubOwner={app.githubOwner}
            githubRepo={app.githubRepo}
            githubBranch={app.githubBranch}
          />
        )}
        {activeTab === "logs" && <LogsTab appId={app.id} />}
        {activeTab === "variables" && <VariablesTab app={app} onChanged={refreshApp} />}
        {activeTab === "metrics" && <MetricsTab appId={app.id} />}
        {activeTab === "settings" && (
          <SettingsTab app={app} url={url} onChanged={refreshApp} />
        )}
      </div>
    </div>
  );
}
