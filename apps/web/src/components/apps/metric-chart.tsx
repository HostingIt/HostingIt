"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MetricPoint {
  value: number | string;
  time: string;
}

function num(v: number | string): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

interface ChartRow {
  t: number;
  label: string;
  value: number;
}

function toRows(points: MetricPoint[]): ChartRow[] {
  return points
    .map((p) => {
      const t = new Date(p.time).getTime();
      if (!Number.isFinite(t)) return null;
      return {
        t,
        label: new Date(t).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: num(p.value),
      };
    })
    .filter((r): r is ChartRow => r !== null)
    .sort((a, b) => a.t - b.t);
}

export function MetricChart({
  title,
  points,
  color,
  unit,
  gradientId,
  compact,
}: {
  title: string;
  points: MetricPoint[];
  color: string;
  unit: string;
  gradientId: string;
  compact?: boolean;
}) {
  const rows = toRows(points);
  const latest = rows.length ? rows[rows.length - 1].value : null;
  const peak = rows.length ? Math.max(...rows.map((r) => r.value)) : null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-muted">{title}</span>
        <span className="font-mono text-sm font-semibold text-ink">
          {latest !== null ? `${latest.toFixed(1)}${unit}` : "N/A"}
        </span>
      </div>
      {rows.length > 1 ? (
        <>
          <div className={compact ? "h-28 w-full" : "h-36 w-full"}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  tickFormatter={(v: number) => `${Math.round(v)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  labelStyle={{ color: "var(--muted)" }}
                  formatter={(value) => [`${Number(value).toFixed(1)}${unit}`, title]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {!compact && (
            <p className="mt-2 text-right font-mono text-[10px] text-muted">
              peak {peak !== null ? peak.toFixed(1) : "N/A"}
              {unit}
            </p>
          )}
        </>
      ) : (
        <p className="py-6 text-center text-xs text-muted">Collecting data…</p>
      )}
    </div>
  );
}

export function latestMetricValue(points: MetricPoint[] | undefined): number | null {
  const rows = toRows(points ?? []);
  return rows.length ? rows[rows.length - 1].value : null;
}
