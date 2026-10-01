import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  const body = (
    <Card
      className={cn(
        "card-elevated h-full border-border",
        href && "card-lift transition-colors hover:border-accent/40"
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
          {detail ? <div className="mt-1 text-xs text-muted">{detail}</div> : null}
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            tone === "default" && "bg-surface-2 text-muted",
            tone === "good" && "bg-accent/15 text-accent",
            tone === "warn" && "bg-amber-500/15 text-amber-600 dark:text-amber-300",
            tone === "danger" && "bg-red-500/15 text-red-600 dark:text-red-400"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Horizontal stacked bar with a legend, for small categorical breakdowns. */
export function BreakdownBar({
  items,
}: {
  items: Array<{ label: string; value: number; className: string }>;
}) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {total > 0 &&
          items
            .filter((i) => i.value > 0)
            .map((i) => (
              <span
                key={i.label}
                className={cn("h-full", i.className)}
                style={{ width: `${(i.value / total) * 100}%` }}
                title={`${i.label}: ${i.value}`}
              />
            ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {items.map((i) => (
          <li key={i.label} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", i.className)} aria-hidden />
            {i.label}
            <span className="font-medium text-ink">{i.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
