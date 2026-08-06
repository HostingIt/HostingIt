"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { FormSection } from "@/components/ui/form-section";
import {
  EnvVarEditor,
  emptyEnvRow,
  type EnvVarRow,
} from "@/components/apps/env-var-editor";
import { DeployTargetPicker } from "@/components/apps/deploy-target-picker";
import type { GithubRepo } from "@/lib/github-repos";
import type { DeployTarget, RepoAnalyzeResult } from "@/lib/repo-analyze";

interface NewAppFormProps {
  repos: GithubRepo[];
}

function formatTargetMeta(target: DeployTarget): string {
  const parts = [target.buildPath, target.buildType];
  if (target.dockerfile) parts.push(target.dockerfile);
  if (target.dockerBuildStage) parts.push(`stage:${target.dockerBuildStage}`);
  return parts.join(" · ");
}

export function NewAppForm({ repos }: NewAppFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [branch, setBranch] = useState("main");
  const [buildPath, setBuildPath] = useState("/");
  const [buildType, setBuildType] = useState("nixpacks");
  const [dockerfile, setDockerfile] = useState("Dockerfile");
  const [dockerContextPath, setDockerContextPath] = useState(".");
  const [dockerBuildStage, setDockerBuildStage] = useState("");
  const [envVars, setEnvVars] = useState<EnvVarRow[]>([emptyEnvRow()]);
  const [buildSecrets, setBuildSecrets] = useState<EnvVarRow[]>([emptyEnvRow()]);
  const [deployImmediately, setDeployImmediately] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analysis, setAnalysis] = useState<RepoAnalyzeResult | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const applyTarget = useCallback((target: DeployTarget) => {
    setSelectedTargetId(target.id);
    setBuildPath(target.buildPath);
    setBuildType(target.buildType);
    setDockerfile(target.dockerfile ?? "Dockerfile");
    setDockerContextPath(target.dockerContextPath ?? ".");
    setDockerBuildStage(target.dockerBuildStage ?? "");
  }, []);

  const runAnalyze = useCallback(
    async (repo: GithubRepo, branchName: string) => {
      setAnalyzing(true);
      setAnalyzeError("");
      setAnalysis(null);
      setSelectedTargetId(null);
      try {
        const params = new URLSearchParams({
          owner: repo.owner,
          repo: repo.name,
          branch: branchName,
        });
        const res = await fetch(`/api/github/repos/analyze?${params}`);
        const data = await res.json();
        if (!res.ok) {
          setAnalyzeError(data.error ?? "Could not analyze repository");
          return;
        }
        const result = data as RepoAnalyzeResult;
        setAnalysis(result);
        const defaultTarget =
          result.targets.find((t) => t.id === result.defaultTargetId) ??
          result.targets[0];
        if (defaultTarget) {
          applyTarget(defaultTarget);
        } else {
          setBuildPath("/");
          setBuildType("nixpacks");
          setDockerfile("Dockerfile");
          setDockerContextPath(".");
          setDockerBuildStage("");
        }
      } catch {
        setAnalyzeError("Could not analyze repository");
      } finally {
        setAnalyzing(false);
      }
    },
    [applyTarget]
  );

  useEffect(() => {
    if (!selectedRepo) return;
    const t = setTimeout(() => {
      void runAnalyze(selectedRepo, branch);
    }, 0);
    return () => clearTimeout(t);
  }, [selectedRepo, branch, runAnalyze]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRepo) return;

    setLoading(true);
    setError("");

    const response = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        githubOwner: selectedRepo.owner,
        githubRepo: selectedRepo.name,
        githubBranch: branch,
        buildPath,
        buildType,
        dockerfile: buildType === "dockerfile" ? dockerfile : undefined,
        dockerContextPath:
          buildType === "dockerfile" ? dockerContextPath : undefined,
        dockerBuildStage:
          buildType === "dockerfile" && dockerBuildStage.trim()
            ? dockerBuildStage.trim()
            : undefined,
        env: envVars.filter((row) => row.key.trim()),
        buildSecrets: buildSecrets.filter((row) => row.key.trim()),
        deployImmediately,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to create app");
      return;
    }

    router.push(`/dashboard/apps/${data.app.id}`);
  }

  const selectedTarget =
    analysis?.targets.find((t) => t.id === selectedTargetId) ?? null;
  const showPicker = (analysis?.targets.length ?? 0) > 1;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="New App"
        description="Deploy a GitHub repository to HostingIt"
      />

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-6">
        {error && <Alert>{error}</Alert>}

        <FormSection title="Basics" description="Name your app and pick a repository.">
          <div className="space-y-2">
            <Label htmlFor="name">App name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-portfolio"
              required
            />
            <p className="text-xs text-muted">
              Used for your URL: fhusr-{"{name}"}.hostingit.online
            </p>
          </div>

          <div className="space-y-2">
            <Label>Repository</Label>
            <select
              className="field-select"
              value={selectedRepo?.fullName ?? ""}
              onChange={(e) => {
                const repo = repos.find((r) => r.fullName === e.target.value);
                setSelectedRepo(repo ?? null);
                if (repo) setBranch(repo.defaultBranch);
              }}
              required
            >
              <option value="">Select a repository</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.fullName}>
                  {repo.fullName} {repo.private ? "(private)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">
              Repos you granted the HostingIt GitHub App access to.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              required
            />
            <p className="text-xs text-muted">
              Defaults to the repo&apos;s default branch when you pick a repository.
            </p>
          </div>
        </FormSection>

        {selectedRepo && (
          <FormSection
            title="Deploy target"
            description="We scan your repo so one-click deploy picks the right folder and Dockerfile."
          >
            {analyzing && (
              <p className="text-sm text-muted">Scanning repository structure…</p>
            )}
            {analyzeError && !analyzing && (
              <Alert variant="error">{analyzeError}</Alert>
            )}
            {!analyzing && !analyzeError && selectedTarget && !showPicker && (
              <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink">
                Detected:{" "}
                <span className="font-medium">{selectedTarget.label}</span>
                <span className="ml-2 font-mono text-xs text-muted">
                  {formatTargetMeta(selectedTarget)}
                </span>
              </div>
            )}
            {!analyzing && showPicker && analysis && (
              <DeployTargetPicker
                targets={analysis.targets}
                selectedId={selectedTargetId}
                onSelect={applyTarget}
              />
            )}
            {!analyzing &&
              !analyzeError &&
              analysis &&
              analysis.targets.length === 0 && (
                <p className="text-sm text-muted">
                  No clear app root detected. We&apos;ll use the repository root —
                  open advanced options to set a subdirectory if needed.
                </p>
              )}
          </FormSection>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((open) => !open)}
            className="font-mono text-sm text-accent hover:underline"
          >
            {showAdvanced ? "Hide" : "Show"} advanced options
          </button>

          {showAdvanced && (
            <div className="animate-panel mt-4 space-y-6">
              <FormSection
                title="Build"
                description="Configure how HostingIt builds and runs your app."
              >
                <div className="space-y-2">
                  <Label htmlFor="buildPath">Root directory</Label>
                  <Input
                    id="buildPath"
                    value={buildPath}
                    onChange={(e) => setBuildPath(e.target.value)}
                    placeholder="/ or apps/web"
                  />
                  <p className="text-xs text-muted">
                    Folder to build (e.g. /backend). One app = one folder.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buildType">Build type</Label>
                  <select
                    id="buildType"
                    className="field-select"
                    value={buildType}
                    onChange={(e) => setBuildType(e.target.value)}
                  >
                    <option value="nixpacks">Auto-detect (Nixpacks)</option>
                    <option value="dockerfile">Dockerfile</option>
                    <option value="static">Static site</option>
                    <option value="railpack">Railpack</option>
                  </select>
                </div>

                {buildType === "dockerfile" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dockerfile">Dockerfile path</Label>
                      <Input
                        id="dockerfile"
                        value={dockerfile}
                        onChange={(e) => setDockerfile(e.target.value)}
                        placeholder="Dockerfile or docker/Dockerfile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dockerContext">Docker context</Label>
                      <Input
                        id="dockerContext"
                        value={dockerContextPath}
                        onChange={(e) => setDockerContextPath(e.target.value)}
                        placeholder="."
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="dockerBuildStage">Build stage</Label>
                      <Input
                        id="dockerBuildStage"
                        value={dockerBuildStage}
                        onChange={(e) => setDockerBuildStage(e.target.value)}
                        placeholder="runner (optional multi-stage target)"
                      />
                      <p className="text-xs text-muted">
                        For multi-stage Dockerfiles, leave blank to use the last
                        stage, or set e.g. runner / production.
                      </p>
                    </div>
                  </div>
                )}
              </FormSection>

              <FormSection
                title="Environment variables"
                description="Runtime config applied before the first deploy."
              >
                <EnvVarEditor rows={envVars} onChange={setEnvVars} />
              </FormSection>

              <FormSection
                title="Build secrets"
                description="Tokens used only during build — not baked into the image."
              >
                <EnvVarEditor
                  rows={buildSecrets}
                  onChange={setBuildSecrets}
                  valueInputMode="password"
                  valuePlaceholder="secret value"
                />
              </FormSection>

              <label className="flex items-start gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={deployImmediately}
                  onChange={(e) => setDeployImmediately(e.target.checked)}
                  className="mt-1 rounded border-border"
                />
                <span>
                  Deploy immediately after creating
                  <span className="mt-0.5 block text-xs text-muted">
                    Uncheck if you need to add env vars first, then redeploy manually.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading || !selectedRepo || analyzing}
            variant="accent" className="btn-glow"
          >
            {loading
              ? "Creating..."
              : analyzing
                ? "Scanning…"
                : deployImmediately
                  ? "Deploy app"
                  : "Create app"}
          </Button>
          <Link href="/dashboard/apps">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
