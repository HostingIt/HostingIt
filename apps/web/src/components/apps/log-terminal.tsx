"use client";

import { useEffect, useMemo, useRef } from "react";
import { splitLogLines, toneForLogLine } from "@/lib/log-format";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  default: "text-[var(--terminal-text)]",
  error: "text-red-400",
  warn: "text-amber-300",
  success: "text-emerald-400",
  info: "text-sky-300/90",
  dim: "text-white/25",
};

export function LogTerminal({
  title,
  subtitle,
  logs,
  live = false,
  status = "idle",
  emptyMessage = "No logs available yet.",
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  logs: string;
  live?: boolean;
  status?: "idle" | "connecting" | "live" | "paused" | "error";
  emptyMessage?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => splitLogLines(logs), [logs]);
  const showEmpty = lines.length === 0 || (lines.length === 1 && !lines[0]);

  useEffect(() => {
    if (!live || !scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [logs, live]);

  const statusLabel =
    status === "connecting"
      ? "connecting"
      : status === "live"
        ? "live"
        : status === "paused"
          ? "paused"
          : status === "error"
            ? "error"
            : "idle";

  return (
    <div
      className={cn(
        "log-terminal overflow-hidden rounded-md border border-black/60",
        className
      )}
    >
      <div className="log-terminal-chrome flex items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px] font-medium tracking-wide text-white/70">
            {title}
            {subtitle ? (
              <span className="text-white/35"> · {subtitle}</span>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            status === "live" && "bg-emerald-400/15 text-emerald-300",
            status === "connecting" && "bg-sky-400/15 text-sky-300",
            status === "paused" && "bg-white/10 text-white/50",
            status === "error" && "bg-red-400/15 text-red-300",
            status === "idle" && "bg-white/5 text-white/40"
          )}
        >
          {(status === "live" || status === "connecting") && (
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />
          )}
          {statusLabel}
        </span>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          "log-terminal-body nice-scroll relative max-h-[36rem] overflow-auto",
          bodyClassName
        )}
      >
        {showEmpty ? (
          <p className="relative px-4 py-10 text-center font-mono text-xs text-white/35">
            {emptyMessage}
          </p>
        ) : (
          <div className="relative py-2 font-mono text-[12px] leading-[1.65]">
            {lines.map((line, i) => {
              const tone = toneForLogLine(line);
              return (
                <div
                  key={`${i}-${line.slice(0, 24)}`}
                  className="group flex gap-3 px-3 hover:bg-white/[0.03]"
                >
                  <span className="w-10 shrink-0 select-none text-right text-[10px] leading-[1.65] text-white/20 group-hover:text-white/35">
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 whitespace-pre-wrap break-all",
                      TONE_CLASS[tone]
                    )}
                  >
                    {line || " "}
                  </span>
                </div>
              );
            })}
            {live && status === "live" ? (
              <div className="flex gap-3 px-3 pt-1">
                <span className="w-10 shrink-0" />
                <span className="inline-block h-4 w-1.5 animate-pulse bg-emerald-400/80" />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
