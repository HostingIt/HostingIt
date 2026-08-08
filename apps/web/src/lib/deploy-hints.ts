export interface DeployHint {
  id: string;
  title: string;
  steps: string[];
}

export interface DeployHintOptions {
  /** Alternate build paths discovered by repo analyze, e.g. ["/frontend", "/backend"] */
  alternativePaths?: string[];
  /** Dockerfile paths found by scan, e.g. ["docker/Dockerfile", "Dockerfile.prod"] */
  alternativeDockerfiles?: string[];
}

/** Turn raw build logs into user-facing remediation steps. */
export function getDeployHints(
  logs: string,
  errorMessage?: string | null,
  options?: DeployHintOptions
): DeployHint[] {
  const text = `${errorMessage ?? ""}\n${logs}`.toLowerCase();
  const hints: DeployHint[] = [];
  const alternatives = options?.alternativePaths?.filter(Boolean) ?? [];
  const dockerfiles = options?.alternativeDockerfiles?.filter(Boolean) ?? [];

  if (
    text.includes("nixpacks") &&
    (text.includes("unable to generate a build plan") ||
      text.includes("unable to generate build plan") ||
      text.includes("nixpacks build failed"))
  ) {
    const altStep =
      alternatives.length > 0
        ? `Try deploying ${alternatives.map((p) => `\`${p}\``).join(" or ")} instead. Open Settings, set Root directory, Save & redeploy (or create a second app).`
        : "If your code lives in a subfolder (e.g. frontend/, backend/), open Settings and set Root directory to that folder.";

    const dockerStep =
      dockerfiles.length > 0
        ? `We found Dockerfile(s): ${dockerfiles.map((p) => `\`${p}\``).join(", ")}. Set Build type to Dockerfile and point Dockerfile path at one of these.`
        : "If the subfolder has a Dockerfile, change Build type to Dockerfile and redeploy.";

    hints.push({
      id: "nixpacks-no-plan",
      title: "Auto-detect could not figure out how to build this repo",
      steps: [
        "Each HostingIt app runs one container, not a full docker-compose stack.",
        altStep,
        dockerStep,
        "For monorepos, pick one folder per HostingIt app (Free allows one app; Pro can run several).",
        "After updating Settings, click Save & redeploy.",
      ],
    });
  }

  if (
    text.includes("dockerfile") &&
    (text.includes("not found") || text.includes("no such file"))
  ) {
    const pathStep =
      dockerfiles.length > 0
        ? `Scan found these paths. Try one in Settings → Dockerfile path: ${dockerfiles.map((p) => `\`${p}\``).join(", ")}.`
        : "In Settings → Build, set Dockerfile path (e.g. Dockerfile, Dockerfile.prod, or docker/Dockerfile).";

    hints.push({
      id: "dockerfile-missing",
      title: "Dockerfile not found at the configured path",
      steps: [
        "Confirm a Dockerfile exists relative to your Root directory.",
        pathStep,
        "Set Docker context path if the Dockerfile expects files from a parent folder.",
        "For multi-stage builds, set Build stage (e.g. runner / production) if needed.",
        "Save & redeploy.",
      ],
    });
  }

  if (text.includes("docker-compose") && text.includes("not supported")) {
    hints.push({
      id: "compose-unsupported",
      title: "docker-compose is not run as a multi-app stack",
      steps: [
        "Choose one folder (frontend or backend) as Root directory for this HostingIt app.",
        "Run databases (Postgres, Redis) elsewhere, not via compose on Free.",
        "On Pro, create a second HostingIt app for the other folder.",
      ],
    });
  }

  if (
    hints.length === 0 &&
    (text.includes("build failed") ||
      text.includes("error occurred") ||
      text.includes("exit code"))
  ) {
    const steps = [
      "Expand the deployment below and read the build log for the first error line.",
      "Check Root directory and Build type under Settings match your repo layout.",
      "Fix the issue in GitHub, or adjust Settings, then Redeploy.",
    ];
    if (alternatives.length > 0) {
      steps.splice(
        1,
        0,
        `Detected other deployable folders: ${alternatives.join(", ")}. Try one in Settings.`
      );
    }
    hints.push({
      id: "generic-build-fail",
      title: "Build failed",
      steps,
    });
  }

  return hints;
}

/** Redact GitHub installation tokens from logs before showing in the UI. */
export function sanitizeDeployLogs(logs: string): string {
  return logs
    .replace(
      /https:\/\/x-access-token:[^@\s]+@github\.com/gi,
      "https://x-access-token:***@github.com"
    )
    .replace(/\bghs_[A-Za-z0-9_]+/g, "ghs_***")
    .replace(/\bghp_[A-Za-z0-9]+/g, "ghp_***");
}
