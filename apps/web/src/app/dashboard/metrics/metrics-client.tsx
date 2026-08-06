"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  MetricChart,
  latestMetricValue,
  type MetricPoint,
} from "@/components/apps/metric-chart";
import { cn } from "@/lib/utils";

interface AppMetrics {
  id: string;
  name: string;
  slug: string;
  status: string;
  metrics: {
    cpu?: MetricPoint[];
    memory?: MetricPoint[];
    network?: MetricPoint[];
    disk?: MetricPoint[];
  } | null;
}

export function MetricsClient() {
  const [apps, setApps] = useState<AppMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | "all">("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      const data = await res.json();
      setApps(data.apps ?? []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const start = setTimeout(load, 0);
    const t = setInterval(load, 10000);
    return () => {
      clearTimeout(start);
      clearInterval(t);
    };
  }, [load]);

  const filtered = filter === "all" ? apps : apps.filter((a) => a.id === filter);

  const peakCpu = Math.max(
    0,
    ...apps.map((a) => latestMetricValue(a.metrics?.cpu) ?? 0)
  );
  const peakMem = Math.max(
    0,
    ...apps.map((a) => latestMetricValue(a.metrics?.memory) ?? 0)
  );

  const hasAnyMetrics = apps.some(
    (a) => a.metrics?.cpu?.length || a.metrics?.memory?.length
  );

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        title="Metrics"
        description="CPU, memory, and network usage across your apps"
      />

      {!loading && apps.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="card-elevated border-border">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Peak CPU (all apps)
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {peakCpu > 0 ? `${peakCpu.toFixed(1)}%` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="card-elevated border-border">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Peak memory (all apps)
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {peakMem > 0 ? `${peakMem.toFixed(1)}%` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {apps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              filter === "all"
                ? "border-accent bg-accent/15 text-ink"
                : "border-border text-muted hover:text-ink"
            )}
          >
            All apps
          </button>
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => setFilter(app.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                filter === app.id
                  ? "border-accent bg-accent/15 text-ink"
                  : "border-border text-muted hover:text-ink"
              )}
            >
              {app.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center text-sm text-muted">
            No apps yet.{" "}
            <Link href="/dashboard/apps/new" className="text-accent hover:underline">
              Create an app
            </Link>{" "}
            to start collecting metrics.
          </CardContent>
        </Card>
      ) : !hasAnyMetrics ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center text-sm text-muted">
            Metrics appear once apps are running and monitoring data is
            available. Start an app and check back shortly.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filtered.map((app) => (
            <Card key={app.id} className="card-elevated border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="font-display text-lg">
                    <Link
                      href={`/dashboard/apps/${app.id}?tab=metrics`}
                      className="hover:text-accent"
                    >
                      {app.name}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted">{app.slug}</p>
                </div>
                <Badge status={app.status} />
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <MetricChart
                    title="CPU"
                    points={app.metrics?.cpu ?? []}
                    color="#14b8a6"
                    unit="%"
                    gradientId={`cpu-${app.id}`}
                    compact
                  />
                  <MetricChart
                    title="Memory"
                    points={app.metrics?.memory ?? []}
                    color="#8b5cf6"
                    unit="%"
                    gradientId={`mem-${app.id}`}
                    compact
                  />
                  <MetricChart
                    title="Network"
                    points={app.metrics?.network ?? []}
                    color="#0ea5e9"
                    unit="KB/s"
                    gradientId={`net-${app.id}`}
                    compact
                  />
                  <MetricChart
                    title="Disk"
                    points={app.metrics?.disk ?? []}
                    color="#f59e0b"
                    unit="%"
                    gradientId={`disk-${app.id}`}
                    compact
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
