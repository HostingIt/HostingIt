"use client";

import type { DeployTarget } from "@/lib/repo-analyze";
import { cn } from "@/lib/utils";

interface DeployTargetPickerProps {
  targets: DeployTarget[];
  selectedId: string | null;
  onSelect: (target: DeployTarget) => void;
  className?: string;
}

export function DeployTargetPicker({
  targets,
  selectedId,
  onSelect,
  className,
}: DeployTargetPickerProps) {
  if (targets.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm text-muted">
        This repo has multiple services. We picked the best default; change if
        you need a different one.
      </p>
      <div className="space-y-2" role="radiogroup" aria-label="Deploy target">
        {targets.map((target) => {
          const selected = target.id === selectedId;
          return (
            <button
              key={target.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(target)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                selected
                  ? "border-accent bg-accent/5 ring-1 ring-accent/40"
                  : "border-border bg-surface hover:bg-surface-2"
              )}
            >
              <span
                className={cn(
                  "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-accent" : "border-muted"
                )}
              >
                {selected && (
                  <span className="h-2 w-2 rounded-full bg-accent" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {target.label}
                </span>
                <span className="mt-0.5 block font-mono text-xs text-muted">
                  {target.buildPath} · {target.buildType}
                  {target.dockerfile ? ` · ${target.dockerfile}` : ""}
                  {target.dockerBuildStage
                    ? ` · stage:${target.dockerBuildStage}`
                    : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
