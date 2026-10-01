import { CircleAlert, CircleCheck, CircleDashed, CircleHelp, TriangleAlert } from "lucide-react";
import { LIMIT_STATUS_COPY, type LimitStatus } from "@/lib/resource-limits";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  muted: "border-border bg-surface-2 text-muted",
} as const;

const ICON = {
  enforced: CircleCheck,
  restart_required: TriangleAlert,
  configured: CircleDashed,
  not_applied: CircleAlert,
  unknown: CircleHelp,
} as const;

export function LimitStatusChip({
  status,
  className,
}: {
  status: LimitStatus;
  className?: string;
}) {
  const copy = LIMIT_STATUS_COPY[status];
  const Icon = ICON[status];
  return (
    <span
      title={copy.hint}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[copy.tone],
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {copy.label}
    </span>
  );
}
