"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DeploymentListItem } from "@/lib/deployments";
import { getDeployHints, sanitizeDeployLogs } from "@/lib/deploy-hints";
import { DeployHintsPanel } from "@/components/apps/deploy-hints-panel";
import { LogTerminal } from "@/components/apps/log-terminal";
import type { RepoAnalyzeResult } from "@/lib/repo-analyze";

type DeploymentItem = DeploymentListItem;

interface DeploymentsTabProps {
  appId: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
}

function formatTime(iso: string | null): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function duration(start: string | null, end: string | null): string {
  if (!start) return "N/A";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.max(0, Math.round((e - s) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return `${m}m ${sec % 60}s`;
}

function badgeClass(status: string): string {
  switch (status) {
    case "done":
      return "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400";
    case "error":
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400";
    case "running":
      return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-500/15 dark:text-zinc-400";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "done":
      return "success";
    case "error":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return status;
  }
}

export function DeploymentsTab({
  appId,
  githubOwner,
  githubRepo,
  githubBranch,
}: DeploymentsTabProps) {
  const [items, setItems] = useState<DeploymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [buildLog, setBuildLog] = useState<string>("");
  const [logLoading, setLogLoading] = useState(false);
  const [rescanLoading, setRescanLoading] = useState(false);
  const [rescan, setRescan] = useState<RepoAnalyzeResult | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/apps/${appId}/deployments`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load deployments");
        return [];
      }
      setError(null);
      setItems(data.deployments ?? []);
      return (data.deployments ?? []) as DeploymentItem[];
    } catch {
      setError("Unable to load deployments.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Poll while any deployment is running
  useEffect(() => {
    const hasRunning = items.some((d) => d.status === "running");
    if (!hasRunning) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [items, load]);

  async function toggleLogs(deploymentId: string) {
    if (expanded === deploymentId) {
      setExpanded(null);
      return;
    }
    setExpanded(deploymentId);
    setLogLoading(true);
    setBuildLog("");
    try {
      const res = await fetch(
        `/api/apps/${appId}/logs?type=build&deploymentId=${deploymentId}&tail=500`
      );
      const data = await res.json();
      setBuildLog(sanitizeDeployLogs(data.logs ?? ""));
    } catch {
      setBuildLog("Unable to load build logs.");
    } finally {
      setLogLoading(false);
    }
  }

  const latestFailed = useMemo(() => {
    const failed = items.filter(
      (d) => d.status === "error" || d.status === "cancelled"
    );
    if (failed.length === 0) return null;
    return [...failed].sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
    )[0];
  }, [items]);

  const [failedLog, setFailedLog] = useState("");

  useEffect(() => {
    if (!latestFailed) return;
    let cancelled = false;
    fetch(
      `/api/apps/${appId}/logs?type=build&deploymentId=${latestFailed.deploymentId}&tail=500`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setFailedLog(sanitizeDeployLogs(data.logs ?? ""));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [appId, latestFailed]);

  const alternativePaths = useMemo(
    () => rescan?.targets.map((t) => t.buildPath) ?? [],
    [rescan]
  );

  const alternativeDockerfiles = useMemo(() => {
    if (!rescan) return [];
    const paths = rescan.targets
      .map((t) => {
        if (!t.dockerfile) return null;
        if (t.buildPath === "/") return t.dockerfile;
        return `${t.buildPath.replace(/^\//, "")}/${t.dockerfile}`;
      })
      .filter((p): p is string => Boolean(p));
    return [...new Set(paths)];
  }, [rescan]);

  const bannerHints = useMemo(() => {
    if (!latestFailed) return [];
    return getDeployHints(failedLog, latestFailed.errorMessage, {
      alternativePaths,
      alternativeDockerfiles,
    });
  }, [latestFailed, failedLog, alternativePaths, alternativeDockerfiles]);

  async function scanRepoAgain() {
    setRescanLoading(true);
    try {
      const params = new URLSearchParams({
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
      });
      const res = await fetch(`/api/github/repos/analyze?${params}`);
      const data = await res.json();
      if (res.ok) setRescan(data as RepoAnalyzeResult);
    } catch {
      // ignore: hints still show without alternatives
    } finally {
      setRescanLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton skeleton-text h-14 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="py-10 text-center text-sm text-muted">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-10 text-center text-sm text-muted">
          No deployments yet. Redeploy or push to your branch to trigger one.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {latestFailed && (
        <div className="space-y-2">
          {bannerHints.length > 0 && (
            <DeployHintsPanel hints={bannerHints} settingsHref="?tab=settings" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={rescanLoading}
              onClick={() => void scanRepoAgain()}
            >
              {rescanLoading ? "Scanning…" : "Scan repo again"}
            </Button>
            {rescan && rescan.targets.length > 0 && (
              <p className="text-xs text-muted">
                Found:{" "}
                {rescan.targets
                  .map((t) => {
                    const bits = [`${t.label} (${t.buildPath})`];
                    if (t.dockerfile) bits.push(t.dockerfile);
                    if (t.dockerBuildStage) bits.push(`stage:${t.dockerBuildStage}`);
                    return bits.join(" · ");
                  })
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
      {items.map((d) => {
        const isFailed = d.status === "error" || d.status === "cancelled";
        const hints =
          expanded === d.deploymentId && buildLog
            ? getDeployHints(buildLog, d.errorMessage, {
                alternativePaths,
                alternativeDockerfiles,
              })
            : isFailed
              ? getDeployHints("", d.errorMessage, {
                  alternativePaths,
                  alternativeDockerfiles,
                })
              : [];

        return (
        <Card key={d.deploymentId} className="border-border">
          <button
            onClick={() => toggleLogs(d.deploymentId)}
            className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
          >
            <span className={`inline-flex items-center gap-1.5 rounded-full border border-black/5 px-2.5 py-0.5 text-xs font-medium capitalize dark:border-white/10 ${badgeClass(d.status)}`}>
              {statusLabel(d.status)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
              {d.title}
            </span>
            <span className="font-mono text-xs text-muted">
              {duration(d.startedAt ?? d.createdAt, d.finishedAt)}
            </span>
            <span className="text-xs text-muted">
              {formatTime(d.createdAt)}
            </span>
          </button>
          {expanded === d.deploymentId && (
            <div className="border-t border-border p-4">
              {d.errorMessage && (
                <p className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  {d.errorMessage}
                </p>
              )}
              {hints.length > 0 && (
                <div className="mb-3">
                  <DeployHintsPanel hints={hints} settingsHref="?tab=settings" />
                </div>
              )}
              {logLoading ? (
                <div className="space-y-1">
                  <div className="skeleton skeleton-text h-3 w-full rounded" />
                  <div className="skeleton skeleton-text h-3 w-5/6 rounded" />
                </div>
              ) : (
                <LogTerminal
                  title="build"
                  subtitle={d.deploymentId.slice(0, 8)}
                  logs={buildLog}
                  status="idle"
                  emptyMessage="No build logs available."
                  bodyClassName="max-h-80 min-h-[10rem]"
                />
              )}
            </div>
          )}
        </Card>
        );
      })}
      </div>
    </div>
  );
}
