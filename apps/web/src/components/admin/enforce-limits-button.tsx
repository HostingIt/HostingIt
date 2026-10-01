"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface EnforceResult {
  appId: string;
  name: string;
  outcome: "reloaded" | "saved" | "skipped" | "failed";
  error?: string;
}

interface Summary {
  reloaded: number;
  saved: number;
  skipped: number;
  failed: number;
}

/** Pushes plan limits to every app (or one) and restarts running containers. */
export function EnforceLimitsButton({
  appId,
  label = "Enforce limits on all apps",
  size = "default",
  variant = "accent",
  onDone,
}: {
  appId?: string;
  label?: string;
  size?: "default" | "sm";
  variant?: "accent" | "outline";
  onDone?: () => void;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failures, setFailures] = useState<EnforceResult[]>([]);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/apps/enforce-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appId ? { appId } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to enforce limits");
        return;
      }
      setSummary(data.summary);
      setFailures(
        (data.results as EnforceResult[]).filter((r) => r.outcome === "failed")
      );
      setConfirm(false);
      onDone?.();
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => setConfirm(true)}
        disabled={busy}
      >
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {busy ? "Enforcing…" : label}
      </Button>

      {error && <Alert>{error}</Alert>}

      {summary && !appId && (
        <Alert variant={summary.failed > 0 ? "warning" : "success"}>
          {summary.reloaded} restarted with new limits · {summary.saved} saved for
          next start
          {summary.skipped > 0 ? ` · ${summary.skipped} still provisioning` : ""}
          {summary.failed > 0 ? ` · ${summary.failed} failed` : ""}
        </Alert>
      )}
      {summary && appId && summary.failed === 0 && (
        <p className="text-xs text-muted">
          {summary.reloaded > 0 ? "Restarted with new limits." : "Saved; applies on next start."}
        </p>
      )}

      {failures.length > 0 && (
        <ul className="space-y-1 text-xs text-muted">
          {failures.map((f) => (
            <li key={f.appId}>
              <span className="font-medium text-ink">{f.name}</span>: {f.error}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={confirm}
        onOpenChange={setConfirm}
        title={appId ? "Enforce limits on this app?" : "Enforce limits on all apps?"}
        description={
          appId
            ? "Saves the owner's plan limits on the deploy platform. If the app is running, its container restarts (no rebuild) to apply them. Expect a few seconds of downtime."
            : "Saves each owner's plan limits on the deploy platform and restarts every running container (no rebuild) so they apply now. Stopped apps get them on next start. Each running app has a few seconds of downtime."
        }
        confirmLabel={appId ? "Enforce" : "Enforce on all apps"}
        variant="accent"
        busy={busy}
        onConfirm={run}
      />
    </div>
  );
}
