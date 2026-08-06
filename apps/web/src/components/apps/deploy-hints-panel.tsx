import Link from "next/link";
import type { DeployHint } from "@/lib/deploy-hints";

export function DeployHintsPanel({
  hints,
  settingsHref,
}: {
  hints: DeployHint[];
  settingsHref?: string;
}) {
  if (hints.length === 0) return null;

  return (
    <div className="space-y-3">
      {hints.map((hint) => (
        <div
          key={hint.id}
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {hint.title}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-amber-900/90 dark:text-amber-100/90">
            {hint.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ))}
      {settingsHref && (
        <Link
          href={settingsHref}
          className="inline-block text-sm font-medium text-accent hover:underline"
        >
          Open Settings to fix build configuration →
        </Link>
      )}
    </div>
  );
}
