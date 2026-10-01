import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProUpcomingBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-[14px] border border-accent/40 bg-accent/[0.06] px-5 py-4",
        className
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-ink">
          Pro plan
          <span className="rounded-full border border-accent/40 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent">
            Upcoming
          </span>
        </p>
        <p className="mt-0.5 text-sm text-muted">
          Paid plans are on the way. We&apos;ll announce details when they open.
        </p>
      </div>
    </div>
  );
}
