"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  EnvVarEditor,
  emptyEnvRow,
  type EnvVarRow,
} from "@/components/apps/env-var-editor";
import type { App } from "@/db/schema";

interface VariablesTabProps {
  app: App;
  onChanged: () => void | Promise<void>;
}

export function VariablesTab({ app, onChanged }: VariablesTabProps) {
  const [envVars, setEnvVars] = useState<EnvVarRow[]>([emptyEnvRow()]);
  const [buildSecrets, setBuildSecrets] = useState<EnvVarRow[]>([emptyEnvRow()]);
  const [buildArgs, setBuildArgs] = useState<EnvVarRow[]>([]);
  const [buildType, setBuildType] = useState<string>("nixpacks");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [envRes, settingsRes] = await Promise.all([
        fetch(`/api/apps/${app.id}/env`),
        fetch(`/api/apps/${app.id}/settings`),
      ]);
      if (envRes.ok) {
        const data = await envRes.json();
        setEnvVars(data.env?.length ? data.env : [emptyEnvRow()]);
        setBuildSecrets(data.buildSecrets?.length ? data.buildSecrets : [emptyEnvRow()]);
        setBuildArgs(data.buildArgs?.length ? data.buildArgs : []);
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setBuildType(data.buildType ?? "nixpacks");
      }
    } finally {
      setLoading(false);
    }
  }, [app.id]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(redeploy: boolean) {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch(`/api/apps/${app.id}/env`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        env: envVars.filter((row) => row.key.trim()),
        buildSecrets: buildSecrets.filter((row) => row.key.trim()),
        buildArgs:
          buildType === "dockerfile"
            ? buildArgs.filter((row) => row.key.trim())
            : undefined,
        redeploy,
      }),
    });
    if (response.ok) {
      setMessage(
        redeploy
          ? "Variables saved and redeploy started."
          : "Variables saved. Redeploy to apply to a running app."
      );
      if (redeploy) await onChanged();
    } else {
      const data = await response.json();
      setError(data.error ?? "Failed to save variables");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton skeleton-text h-40 w-full rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <Alert variant={error ? "error" : "success"}>{error || message}</Alert>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Environment variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            Runtime configuration. Mark sensitive values as Secret to mask them.
          </p>
          <EnvVarEditor rows={envVars} onChange={setEnvVars} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={saving} onClick={() => save(false)}>
              Save
            </Button>
            <Button
              disabled={saving}
              onClick={() => save(true)}
              variant="accent"
            >
              Save & redeploy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Build secrets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            Credentials used only during build (private registries, tokens). Not
            baked into the final image.
          </p>
          <EnvVarEditor
            rows={buildSecrets}
            onChange={setBuildSecrets}
            valueInputMode="password"
            valuePlaceholder="secret value"
          />
          {buildType === "dockerfile" && (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium text-ink">Dockerfile build args</p>
              <EnvVarEditor
                rows={buildArgs.length ? buildArgs : [emptyEnvRow()]}
                onChange={setBuildArgs}
                valueInputMode="text"
                keyPlaceholder="ARG_NAME"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
