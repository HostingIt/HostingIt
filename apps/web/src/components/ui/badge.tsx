import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  creating:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  deploying: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  running: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  stopped: "bg-zinc-100 text-zinc-800 dark:bg-zinc-500/15 dark:text-zinc-400",
  error: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  success:
    "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  active: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  suspended: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

const dotStyles: Record<string, string> = {
  creating: "bg-yellow-500",
  deploying: "bg-blue-500",
  running: "bg-green-500",
  stopped: "bg-zinc-400",
  error: "bg-red-500",
  failed: "bg-red-500",
  success: "bg-green-500",
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  active: "bg-green-500",
  suspended: "bg-red-500",
};

const pulsing = new Set(["creating", "deploying", "running"]);

export function Badge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-black/5 px-2.5 py-0.5 text-xs font-medium capitalize dark:border-white/10",
        statusStyles[status] ?? "bg-zinc-100 text-zinc-800 dark:bg-zinc-500/15 dark:text-zinc-400",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          dotStyles[status] ?? "bg-zinc-400",
          pulsing.has(status) && "pulse-dot"
        )}
      />
      {status}
    </span>
  );
}
