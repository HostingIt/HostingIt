"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Cpu,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  Search,
  Square,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { LimitStatusChip } from "@/components/security/limit-status-chip";
import {
  formatCpu,
  formatMemory,
  LIMIT_STATUS_COPY,
  type LimitStatus,
  type NumericLimits,
} from "@/lib/resource-limits";

export interface AdminInstanceRow {
  id: string;
  name: string;
  status: string;
  ownerId: string;
  ownerEmail: string;
  plan: string;
  planLimits: string;
  url: string;
  repo: string;
  branch: string;
  customDomain: boolean;
  createdAgo: string;
}

interface LimitRow {
  appId: string;
  status: LimitStatus;
  expected: NumericLimits;
  configured: NumericLimits | null;
  runtime: NumericLimits | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Any status" },
  { value: "running", label: "Running" },
  { value: "deploying", label: "Deploying" },
  { value: "stopped", label: "Stopped" },
  { value: "error", label: "Error" },
];

const LIMIT_OPTIONS = [
  { value: "all", label: "Any limits" },
  { value: "attention", label: "Needs attention" },
  { value: "enforced", label: "Enforced" },
];

function describeLimits(limit: NumericLimits | null): string {
  if (!limit) return "—";
  return `${formatCpu(limit.nanoCpus)} · ${formatMemory(limit.memoryBytes)}`;
}

export function InstancesTable({
  instances,
  initialQuery,
  initialStatus,
}: {
  instances: AdminInstanceRow[];
  initialQuery: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(
    STATUS_OPTIONS.some((o) => o.value === initialStatus) ? initialStatus : "all"
  );
  const [limitFilter, setLimitFilter] = useState("all");
  const [limits, setLimits] = useState<Map<string, LimitRow> | null>(null);
  const [limitsError, setLimitsError] = useState("");
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [stopTarget, setStopTarget] = useState<AdminInstanceRow | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadLimits = useCallback(async () => {
    setLoadingLimits(true);
    setLimitsError("");
    try {
      const res = await fetch("/api/admin/apps/limits");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLimitsError(data.error ?? "Could not load limits");
        return;
      }
      setLimits(new Map((data.limits as LimitRow[]).map((l) => [l.appId, l])));
    } catch {
      setLimitsError("Could not reach the server");
    } finally {
      setLoadingLimits(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadLimits, 0);
    return () => clearTimeout(t);
  }, [loadLimits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instances.filter((i) => {
      if (
        q &&
        !i.name.toLowerCase().includes(q) &&
        !i.ownerEmail.toLowerCase().includes(q) &&
        !i.repo.toLowerCase().includes(q) &&
        !i.url.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (status !== "all") {
        const s = i.status === "creating" ? "deploying" : i.status;
        if (s !== status) return false;
      }
      if (limitFilter !== "all" && limits) {
        const l = limits.get(i.id)?.status;
        if (limitFilter === "enforced" && l !== "enforced") return false;
        if (
          limitFilter === "attention" &&
          l !== "restart_required" &&
          l !== "not_applied"
        ) {
          return false;
        }
      }
      return true;
    });
  }, [instances, query, status, limitFilter, limits]);

  const attentionCount = useMemo(() => {
    if (!limits) return 0;
    let n = 0;
    for (const l of limits.values()) {
      if (l.status === "restart_required" || l.status === "not_applied") n++;
    }
    return n;
  }, [limits]);

  async function enforce(app: AdminInstanceRow) {
    setBusyId(app.id);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/apps/enforce-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: app.id }),
      });
      const data = await res.json().catch(() => ({}));
      const result = data.results?.[0];
      if (!res.ok || result?.outcome === "failed") {
        setNotice({ tone: "error", text: `${app.name}: ${result?.error ?? data.error ?? "failed"}` });
      } else {
        setNotice({
          tone: "success",
          text:
            result?.outcome === "reloaded"
              ? `${app.name} restarted with ${app.planLimits}.`
              : `${app.name}: limits saved; they apply on next start.`,
        });
      }
      await loadLimits();
    } finally {
      setBusyId(null);
    }
  }

  async function stop(app: AdminInstanceRow) {
    setBusyId(app.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/apps/${app.id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ tone: "error", text: data.error ?? "Failed to stop app" });
      } else {
        setNotice({ tone: "success", text: `${app.name} stopped.` });
        setStopTarget(null);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search instances</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by app, owner, repo, or URL…"
            className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus-visible:border-accent"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 lg:flex">
          <div className="lg:w-40">
            <SelectDropdown size="sm" fullWidth label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
          </div>
          <div className="lg:w-44">
            <SelectDropdown size="sm" fullWidth label="Limits" value={limitFilter} options={LIMIT_OPTIONS} onChange={setLimitFilter} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => void loadLimits()} disabled={loadingLimits}>
          <RefreshCw className={loadingLimits ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
          Recheck limits
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          Showing {filtered.length} of {instances.length} instances
        </span>
        {limits && attentionCount > 0 && (
          <button
            type="button"
            onClick={() => setLimitFilter("attention")}
            className="font-medium text-amber-700 hover:underline dark:text-amber-300"
          >
            {attentionCount} need limit attention →
          </button>
        )}
      </div>

      {limitsError && <Alert variant="warning">Limits unavailable: {limitsError}</Alert>}
      {notice && <Alert variant={notice.tone === "success" ? "success" : "error"}>{notice.text}</Alert>}

      <Card className="card-elevated overflow-hidden border-border">
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">No instances match these filters.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((app) => {
              const limit = limits?.get(app.id);
              return (
                <li
                  key={app.id}
                  className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-ink">{app.name}</p>
                      <Badge status={app.status} />
                    </div>
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex max-w-full items-center gap-1 font-mono text-xs text-accent hover:underline"
                    >
                      <span className="truncate">{app.url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                    </a>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
                      {app.repo}@{app.branch} · created {app.createdAgo}
                    </p>
                  </div>

                  <div className="min-w-0 text-sm">
                    <Link
                      href={`/admin/users?user=${app.ownerId}`}
                      className="block truncate text-ink hover:underline"
                    >
                      {app.ownerEmail}
                    </Link>
                    <div className="mt-1">
                      <Badge status={app.plan} />
                    </div>
                  </div>

                  <div className="min-w-0 text-xs">
                    <p className="flex items-center gap-1.5 text-ink">
                      <Cpu className="h-3.5 w-3.5 text-muted" aria-hidden />
                      {app.planLimits}
                    </p>
                    <div className="mt-1.5">
                      {limit ? (
                        <div className="space-y-1">
                          <LimitStatusChip status={limit.status} />
                          {(limit.status === "restart_required" ||
                            limit.status === "not_applied") && (
                            <p className="text-muted" title={LIMIT_STATUS_COPY[limit.status].hint}>
                              {limit.runtime
                                ? `Running: ${describeLimits(limit.runtime)}`
                                : `Saved: ${describeLimits(limit.configured)}`}
                            </p>
                          )}
                        </div>
                      ) : loadingLimits ? (
                        <span className="skeleton skeleton-text inline-block h-5 w-28 rounded-full" />
                      ) : (
                        <LimitStatusChip status="unknown" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    {(limit?.status === "restart_required" || limit?.status === "not_applied") && (
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={busyId === app.id}
                        onClick={() => void enforce(app)}
                      >
                        {busyId === app.id ? "Applying…" : "Enforce"}
                      </Button>
                    )}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          aria-label={`Actions for ${app.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          align="end"
                          sideOffset={6}
                          className="z-50 min-w-[12rem] rounded-xl border border-border bg-surface p-1 shadow-lg"
                        >
                          <DropdownMenu.Item
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface-2"
                            disabled={busyId === app.id}
                            onSelect={() => void enforce(app)}
                          >
                            <Cpu className="h-4 w-4 text-muted" aria-hidden />
                            Enforce plan limits
                          </DropdownMenu.Item>
                          <DropdownMenu.Item asChild>
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface-2"
                            >
                              <ExternalLink className="h-4 w-4 text-muted" aria-hidden />
                              Open live URL
                            </a>
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="my-1 h-px bg-border" />
                          <DropdownMenu.Item
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-red-500/10 dark:text-red-400"
                            disabled={app.status === "stopped" || busyId === app.id}
                            onSelect={() => setStopTarget(app)}
                          >
                            <Square className="h-4 w-4" aria-hidden />
                            Stop app
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmModal
        open={!!stopTarget}
        onOpenChange={(open) => !open && setStopTarget(null)}
        title={`Stop ${stopTarget?.name ?? "app"}?`}
        description={`The container for ${stopTarget?.ownerEmail ?? "this user"} is scaled to zero. The owner sees "App stopped by administrator" in their Security log and can start it again.`}
        confirmLabel="Stop app"
        busy={!!stopTarget && busyId === stopTarget.id}
        onConfirm={() => (stopTarget ? stop(stopTarget) : undefined)}
      />
    </div>
  );
}
