"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { App } from "@/db/schema";

interface AppControlsProps {
  app: App;
  onChanged: () => void | Promise<void>;
}

export function AppControls({ app, onChanged }: AppControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function call(path: string, body?: unknown, label?: string) {
    setLoading(label ?? path);
    setError("");
    try {
      const res = await fetch(`/api/apps/${app.id}/${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Action failed");
      }
      await onChanged();
    } finally {
      setLoading(null);
    }
  }

  const isStopped = app.status === "stopped";
  const isDeploying = app.status === "deploying" || app.status === "creating";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {isStopped ? (
          <Button
            size="sm"
            onClick={() => call("control", { action: "start" }, "start")}
            disabled={loading !== null}
            className="bg-accent hover:bg-accent-deep"
          >
            {loading === "start" ? "Starting…" : "Start"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => call("control", { action: "stop" }, "stop")}
            disabled={loading !== null}
          >
            {loading === "stop" ? "Stopping…" : "Stop"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => call("control", { action: "restart" }, "restart")}
          disabled={loading !== null || isStopped}
        >
          {loading === "restart" ? "Restarting…" : "Restart"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => call("redeploy", undefined, "redeploy")}
          disabled={loading !== null}
        >
          {loading === "redeploy" ? "Deploying…" : "Redeploy"}
        </Button>
        {isDeploying && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => call("control", { action: "cancel" }, "cancel")}
            disabled={loading !== null}
          >
            Cancel deploy
          </Button>
        )}
      </div>
      {error && <Alert className="mt-2">{error}</Alert>}
    </div>
  );
}
