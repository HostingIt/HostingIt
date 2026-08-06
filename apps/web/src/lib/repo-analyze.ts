import {
  githubContents,
  githubFileText,
  type GithubContentEntry,
} from "@/lib/github-app";
import {
  detectLayout,
  findDockerfileName,
  KNOWN_SERVICE_DIRS,
  MAX_SCANNED_DIRS,
  normalizeBuildPath,
  parseComposeBuildSpecs,
  parseDockerfileStages,
  pickDockerBuildStage,
  rankTargets,
  ROOT_MARKERS,
  scoreDirectory,
  selectDefaultTarget,
  SKIP_DIRS,
  type DeployTarget,
  type RepoAnalyzeResult,
} from "@/lib/repo-analyze-core";

export type {
  DeployBuildType,
  DeployTarget,
  RepoAnalyzeResult,
  RepoLayout,
} from "@/lib/repo-analyze-core";

export {
  detectLayout,
  findDockerfileName,
  parseComposeBuildSpecs,
  parseComposeContexts,
  parseDockerfileStages,
  pickDockerBuildStage,
  rankTargets,
  scoreDirectory,
  selectDefaultTarget,
} from "@/lib/repo-analyze-core";

function fileNames(entries: GithubContentEntry[]): Set<string> {
  return new Set(entries.filter((e) => e.type === "file").map((e) => e.name));
}

function dirNames(entries: GithubContentEntry[]): string[] {
  return entries.filter((e) => e.type === "dir").map((e) => e.name);
}

async function listDir(
  installationId: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<GithubContentEntry[]> {
  const result = await githubContents(installationId, owner, repo, path, branch);
  if (!result) return [];
  if (Array.isArray(result)) return result;
  return [];
}

async function resolveDockerfileMeta(
  installationId: string,
  owner: string,
  repo: string,
  branch: string,
  buildPath: string,
  entries: GithubContentEntry[]
): Promise<{
  dockerfile?: string;
  dockerContextPath?: string;
  dockerBuildStage?: string;
  dockerfileStages?: string[];
}> {
  const names = fileNames(entries);
  const dirs = dirNames(entries);
  const rootPath = buildPath === "/" ? "" : buildPath.replace(/^\//, "");

  let dockerfileRel = findDockerfileName(names);
  let dockerfilePathInRepo = dockerfileRel
    ? rootPath
      ? `${rootPath}/${dockerfileRel}`
      : dockerfileRel
    : null;

  // Nested docker/ or .docker/
  if (!dockerfileRel) {
    for (const nested of ["docker", ".docker"]) {
      if (!dirs.includes(nested)) continue;
      const nestedPath = rootPath ? `${rootPath}/${nested}` : nested;
      const nestedEntries = await listDir(
        installationId,
        owner,
        repo,
        nestedPath,
        branch
      );
      const nestedName = findDockerfileName(fileNames(nestedEntries));
      if (nestedName) {
        dockerfileRel = `${nested}/${nestedName}`;
        dockerfilePathInRepo = `${nestedPath}/${nestedName}`;
        break;
      }
    }
  }

  if (!dockerfileRel || !dockerfilePathInRepo) return {};

  const text = await githubFileText(
    installationId,
    owner,
    repo,
    dockerfilePathInRepo,
    branch
  );
  const stages = text ? parseDockerfileStages(text) : [];
  const stage = pickDockerBuildStage(stages);

  return {
    dockerfile: dockerfileRel,
    dockerContextPath: ".",
    dockerBuildStage: stage ?? undefined,
    dockerfileStages: stages.length ? stages : undefined,
  };
}

async function scorePath(
  installationId: string,
  owner: string,
  repo: string,
  branch: string,
  buildPath: string
): Promise<DeployTarget | null> {
  const path = buildPath === "/" ? "" : buildPath.replace(/^\//, "");
  const entries = await listDir(installationId, owner, repo, path, branch);
  if (entries.length === 0) return null;

  const names = fileNames(entries);
  let packageScripts: { start?: boolean; dev?: boolean } | undefined;

  if (names.has("package.json")) {
    const pkgPath = path ? `${path}/package.json` : "package.json";
    const text = await githubFileText(
      installationId,
      owner,
      repo,
      pkgPath,
      branch
    );
    if (text) {
      try {
        const pkg = JSON.parse(text) as {
          scripts?: Record<string, string>;
        };
        packageScripts = {
          start: Boolean(pkg.scripts?.start),
          dev: Boolean(pkg.scripts?.dev),
        };
      } catch {
        // ignore invalid package.json
      }
    }
  }

  const dockerMeta = await resolveDockerfileMeta(
    installationId,
    owner,
    repo,
    branch,
    buildPath,
    entries
  );

  return scoreDirectory(buildPath, names, {
    packageScripts,
    ...dockerMeta,
  });
}

function mergeComposeOntoTarget(
  existing: DeployTarget | null,
  buildPath: string,
  spec: { dockerfile?: string; target?: string }
): DeployTarget {
  const base =
    existing ??
    ({
      id: buildPath === "/" ? "root" : buildPath.replace(/^\//, "").replace(/\//g, "-"),
      label: `${buildPath === "/" ? "Root" : buildPath} (Docker)`,
      buildPath,
      buildType: "dockerfile" as const,
      confidence: 45,
      signals: ["compose"],
    } satisfies DeployTarget);

  const next: DeployTarget = {
    ...base,
    buildType: "dockerfile",
    confidence: Math.max(base.confidence, 50),
    dockerContextPath: base.dockerContextPath ?? ".",
  };

  if (spec.dockerfile) {
    next.dockerfile = spec.dockerfile.replace(/^\.\//, "");
    if (!next.signals.includes(next.dockerfile)) {
      next.signals = [...next.signals, next.dockerfile];
    }
  } else if (!next.dockerfile) {
    next.dockerfile = "Dockerfile";
  }

  if (spec.target) {
    next.dockerBuildStage = spec.target;
    next.signals = [
      ...next.signals.filter((s) => !s.startsWith("stage:")),
      `stage:${spec.target}`,
    ];
    next.confidence += 8;
  }

  return next;
}

/**
 * Analyze a GitHub repo for deployable service roots.
 * Uses shallow Contents API scans (not a full recursive tree).
 */
export async function analyzeRepo(input: {
  installationId: string;
  owner: string;
  repo: string;
  branch: string;
}): Promise<RepoAnalyzeResult> {
  const { installationId, owner, repo, branch } = input;

  const rootEntries = await listDir(installationId, owner, repo, "", branch);
  const rootNames = fileNames(rootEntries);
  const rootDirs = dirNames(rootEntries);

  const targetsByPath = new Map<string, DeployTarget>();
  let hadCompose = false;

  const rootDeployable =
    ROOT_MARKERS.some((m) => rootNames.has(m)) ||
    Boolean(findDockerfileName(rootNames));

  if (rootDeployable) {
    const rootTarget = await scorePath(
      installationId,
      owner,
      repo,
      branch,
      "/"
    );
    if (rootTarget) targetsByPath.set("/", rootTarget);
  }

  const composeFile = [
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
  ].find((name) => rootNames.has(name));

  if (composeFile) {
    hadCompose = true;
    const composeText = await githubFileText(
      installationId,
      owner,
      repo,
      composeFile,
      branch
    );
    if (composeText) {
      for (const spec of parseComposeBuildSpecs(composeText)) {
        const ctx = spec.context;
        let target = targetsByPath.get(ctx) ?? null;
        if (!target && ctx !== "/") {
          target = await scorePath(installationId, owner, repo, branch, ctx);
        }
        const merged = mergeComposeOntoTarget(target, ctx, spec);
        // If we already scored dockerfile stages but compose specifies target, prefer compose
        if (spec.target) {
          merged.dockerBuildStage = spec.target;
        }
        targetsByPath.set(ctx, merged);
      }
    }
  }

  const candidates: string[] = [];
  for (const dir of rootDirs) {
    if (SKIP_DIRS.has(dir)) continue;
    if (KNOWN_SERVICE_DIRS.has(dir) || !rootDeployable) {
      candidates.push(dir);
    }
  }

  for (const parent of ["apps", "packages", "services"]) {
    if (!rootDirs.includes(parent)) continue;
    const nested = await listDir(
      installationId,
      owner,
      repo,
      parent,
      branch
    );
    for (const name of dirNames(nested)) {
      if (SKIP_DIRS.has(name)) continue;
      candidates.push(`${parent}/${name}`);
    }
  }

  const uniqueCandidates = [...new Set(candidates)].slice(0, MAX_SCANNED_DIRS);

  for (const rel of uniqueCandidates) {
    const buildPath = normalizeBuildPath(rel);
    if (targetsByPath.has(buildPath)) {
      // Enrich existing compose target with scanned dockerfile if missing stages
      const existing = targetsByPath.get(buildPath)!;
      if (existing.buildType === "dockerfile" && !existing.dockerfileStages) {
        const scored = await scorePath(
          installationId,
          owner,
          repo,
          branch,
          buildPath
        );
        if (scored) {
          targetsByPath.set(buildPath, {
            ...existing,
            dockerfile: existing.dockerfile ?? scored.dockerfile,
            dockerContextPath:
              existing.dockerContextPath ?? scored.dockerContextPath,
            dockerBuildStage:
              existing.dockerBuildStage ?? scored.dockerBuildStage,
            dockerfileStages: scored.dockerfileStages,
            confidence: Math.max(existing.confidence, scored.confidence),
            signals: [...new Set([...existing.signals, ...scored.signals])],
          });
        }
      }
      continue;
    }
    const target = await scorePath(
      installationId,
      owner,
      repo,
      branch,
      buildPath
    );
    if (target) targetsByPath.set(buildPath, target);
  }

  if (targetsByPath.size === 0) {
    const fallback = await scorePath(installationId, owner, repo, branch, "/");
    if (fallback) targetsByPath.set("/", fallback);
  }

  let targets = rankTargets([...targetsByPath.values()]);
  if (
    targets.length > 1 &&
    targets.some((t) => t.buildPath === "/") &&
    targets.some((t) => t.buildPath !== "/")
  ) {
    const root = targets.find((t) => t.buildPath === "/");
    const subs = targets.filter((t) => t.buildPath !== "/");
    if (root && subs[0] && root.confidence <= subs[0].confidence + 5) {
      targets = rankTargets(subs);
    }
  }

  const defaultTargetId = selectDefaultTarget(targets);

  return {
    targets,
    defaultTargetId,
    repoLayout: detectLayout(targets, hadCompose),
  };
}
