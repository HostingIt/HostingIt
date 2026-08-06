"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "@/components/apps/metric-chart";
import type { MetricPoint } from "@/components/apps/metric-chart";

interface Metrics {
  cpu?: MetricPoint[];
  memory?: MetricPoint[];
  disk?: MetricPoint[];
  network?: MetricPoint[];
}

export function MetricsTab({ appId }: { appId: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/apps/${appId}/metrics`);
      const data = await res.json();
      setMetrics(data.metrics ?? null);
    } catch {
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    const start = setTimeout(load, 0);
    const t = setInterval(load, 10000);
    return () => {
      clearTimeout(start);
      clearInterval(t);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-text h-56 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!metrics || (!metrics.cpu?.length && !metrics.memory?.length)) {
    return (
      <Card className="border-border">
        <CardContent className="py-10 text-center text-sm text-muted">
          Metrics are not available for this app yet. They appear once the app
          is running and monitoring data is available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="card-elevated border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted">CPU</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricChart
            title="CPU"
            points={metrics.cpu ?? []}
            color="#14b8a6"
            unit="%"
            gradientId={`app-cpu-${appId}`}
          />
        </CardContent>
      </Card>
      <Card className="card-elevated border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted">Memory</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricChart
            title="Memory"
            points={metrics.memory ?? []}
            color="#8b5cf6"
            unit="%"
            gradientId={`app-mem-${appId}`}
          />
        </CardContent>
      </Card>
      <Card className="card-elevated border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted">Network</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricChart
            title="Network"
            points={metrics.network ?? []}
            color="#0ea5e9"
            unit="KB/s"
            gradientId={`app-net-${appId}`}
          />
        </CardContent>
      </Card>
      <Card className="card-elevated border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted">Disk</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricChart
            title="Disk"
            points={metrics.disk ?? []}
            color="#f59e0b"
            unit="%"
            gradientId={`app-disk-${appId}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
