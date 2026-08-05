import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  creating: "bg-yellow-100 text-yellow-800",
  deploying: "bg-blue-100 text-blue-800",
  running: "bg-green-100 text-green-800",
  stopped: "bg-zinc-100 text-zinc-800",
  error: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
};

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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "bg-zinc-100 text-zinc-800",
        className
      )}
    >
      {status}
    </span>
  );
}
