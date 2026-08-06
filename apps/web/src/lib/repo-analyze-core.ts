export type DeployBuildType = "nixpacks" | "dockerfile" | "static";

export interface DeployTarget {
  id: string;
  label: string;
  buildPath: string;
  buildType: DeployBuildType;
  confidence: number;
  signals: string[];
  dockerfile?: string;
  dockerContextPath?: string;
  dockerBuildStage?: string;
  dockerfileStages?: string[];
}

export type RepoLayout = "single" | "monorepo" | "compose";

export interface RepoAnalyzeResult {
  targets: DeployTarget[];
  defaultTargetId: string | null;
  repoLayout: RepoLayout;
}

export interface ComposeBuildSpec {
  context: string;
  dockerfile?: string;
  target?: string;
}

export const SKIP_DIRS = new Set([
  ".git",
  ".github",
  ".cursor",
  "node_modules",
  "docs",
  "doc",
  "tests",
  "test",
  "__tests__",
  "coverage",
  "dist",
  "build",
  ".next",
  "vendor",
  "ml",
  "models",
  "data",
]);

export const WEB_NAME_BOOST = new Set([
  "frontend",
  "web",
  "client",
  "app",
  "ui",
  "www",
]);

export const KNOWN_SERVICE_DIRS = new Set([
  "frontend",
  "backend",
  "web",
  "client",
  "api",
  "server",
  "apps",
  "services",
  "packages",
]);

export const MAX_SCANNED_DIRS = 12;

export const ROOT_MARKERS = [
  "package.json",
  "Dockerfile",
  "dockerfile",
  "Containerfile",
  "go.mod",
  "requirements.txt",
  "pyproject.toml",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
];

const PRODUCTION_STAGE =
  /^(production|prod|runner|final|release|app|runtime)$/i;

const DOCKERFILE_PRIORITY = [
  "Dockerfile.production",
  "Dockerfile.prod",
  "Dockerfile.release",
  "Dockerfile",
  "dockerfile",
  "Containerfile",
];

export function normalizeBuildPath(path: string): string {
  if (!path || path === "." || path === "/") return "/";
  const cleaned = path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}` : "/";
}

function pathToId(buildPath: string): string {
  if (buildPath === "/") return "root";
  return buildPath.replace(/^\//, "").replace(/\//g, "-");
}

function titleCase(name: string): string {
  return name
    .split(/[-_/]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isDockerfileLike(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === "dockerfile" ||
    lower === "containerfile" ||
    lower.startsWith("dockerfile.") ||
    lower.endsWith(".dockerfile")
  );
}

/** Pick the best Dockerfile variant from a directory listing. */
export function findDockerfileName(fileNames: Set<string>): string | null {
  const byLower = new Map<string, string>();
  for (const name of fileNames) {
    byLower.set(name.toLowerCase(), name);
  }

  for (const preferred of DOCKERFILE_PRIORITY) {
    const hit = byLower.get(preferred.toLowerCase());
    if (hit) return hit;
  }

  const others = [...fileNames]
    .filter((n) => isDockerfileLike(n))
    .sort((a, b) => a.localeCompare(b));
  return others[0] ?? null;
}

/** Extract multi-stage names from Dockerfile content. */
export function parseDockerfileStages(content: string): string[] {
  const stages: string[] = [];
  const re = /^\s*FROM\s+.+\s+[Aa][Ss]\s+(\S+)\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const name = match[1]?.replace(/["']/g, "");
    if (name) stages.push(name);
  }
  return stages;
}

/** Prefer production-like stage names; else last AS stage. */
export function pickDockerBuildStage(stages: string[]): string | null {
  if (stages.length === 0) return null;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (PRODUCTION_STAGE.test(stages[i])) return stages[i];
  }
  return stages[stages.length - 1] ?? null;
}

export interface ScoreDirectoryOptions {
  packageScripts?: { start?: boolean; dev?: boolean };
  /** Relative dockerfile path within build root, e.g. docker/Dockerfile */
  dockerfile?: string;
  dockerContextPath?: string;
  dockerBuildStage?: string;
  dockerfileStages?: string[];
}

/** Score a directory listing into a deploy target (or null if not deployable). */
export function scoreDirectory(
  buildPath: string,
  names: Set<string>,
  options?: ScoreDirectoryOptions
): DeployTarget | null {
  const signals: string[] = [];
  let confidence = 0;
  let buildType: DeployBuildType = "nixpacks";
  let runtimeLabel = "App";

  const dockerfileName =
    options?.dockerfile?.split("/").pop() ?? findDockerfileName(names);
  const hasDockerfile = Boolean(dockerfileName || options?.dockerfile);

  if (hasDockerfile) {
    signals.push(options?.dockerfile ?? dockerfileName ?? "Dockerfile");
    confidence += 40;
    buildType = "dockerfile";
    runtimeLabel = "Docker";
    if (options?.dockerBuildStage) {
      confidence += 10;
      signals.push(`stage:${options.dockerBuildStage}`);
    }
  }

  if (names.has("package.json")) {
    signals.push("package.json");
    confidence += 25;
    if (buildType !== "dockerfile") runtimeLabel = "Node";
    if (options?.packageScripts?.start || options?.packageScripts?.dev) {
      confidence += 15;
      signals.push(
        options.packageScripts.start ? "scripts.start" : "scripts.dev"
      );
    }
  }

  const hasNext =
    names.has("next.config.js") ||
    names.has("next.config.mjs") ||
    names.has("next.config.ts");
  const hasVite =
    names.has("vite.config.js") ||
    names.has("vite.config.ts") ||
    names.has("vite.config.mjs");
  if (hasNext) {
    signals.push("next.config");
    confidence += 20;
    if (buildType !== "dockerfile") {
      runtimeLabel = "Next.js";
      buildType = "nixpacks";
    } else {
      runtimeLabel = "Next.js";
    }
  } else if (hasVite) {
    signals.push("vite.config");
    confidence += 15;
    if (buildType !== "dockerfile") {
      runtimeLabel = "Vite";
      buildType = "nixpacks";
    } else {
      runtimeLabel = "Vite";
    }
  }

  if (
    names.has("requirements.txt") ||
    names.has("pyproject.toml") ||
    names.has("Pipfile")
  ) {
    signals.push("Python");
    confidence += 25;
    if (buildType !== "dockerfile") runtimeLabel = "Python";
  }
  if (names.has("go.mod")) {
    signals.push("go.mod");
    confidence += 25;
    if (buildType !== "dockerfile") runtimeLabel = "Go";
  }
  if (names.has("Cargo.toml")) {
    signals.push("Cargo.toml");
    confidence += 25;
    if (buildType !== "dockerfile") runtimeLabel = "Rust";
  }
  if (names.has("Gemfile")) {
    signals.push("Gemfile");
    confidence += 20;
    if (buildType !== "dockerfile") runtimeLabel = "Ruby";
  }

  const onlyStatic =
    names.has("index.html") &&
    !names.has("package.json") &&
    !hasDockerfile &&
    !names.has("go.mod") &&
    !names.has("requirements.txt") &&
    !names.has("pyproject.toml");
  if (onlyStatic) {
    signals.push("index.html");
    confidence += 30;
    buildType = "static";
    runtimeLabel = "Static";
  } else if (names.has("index.html") && !names.has("package.json")) {
    signals.push("index.html");
    confidence += 10;
  }

  if (confidence < 20) return null;

  const folder =
    buildPath === "/"
      ? "Root"
      : titleCase(buildPath.replace(/^\//, "").split("/").pop() ?? "App");
  const folderKey = (
    buildPath === "/" ? "" : (buildPath.split("/").pop() ?? "")
  ).toLowerCase();
  if (WEB_NAME_BOOST.has(folderKey)) {
    confidence += 12;
  }

  const target: DeployTarget = {
    id: pathToId(buildPath),
    label: `${folder} (${runtimeLabel})`,
    buildPath: normalizeBuildPath(buildPath),
    buildType,
    confidence,
    signals,
  };

  if (hasDockerfile) {
    target.dockerfile =
      options?.dockerfile ?? dockerfileName ?? "Dockerfile";
    target.dockerContextPath = options?.dockerContextPath ?? ".";
    if (options?.dockerBuildStage) {
      target.dockerBuildStage = options.dockerBuildStage;
    }
    if (options?.dockerfileStages?.length) {
      target.dockerfileStages = options.dockerfileStages;
    }
  }

  return target;
}

/**
 * Parse docker-compose for per-service build context / dockerfile / target.
 * Context "." (repo root) is omitted — not a useful sub-service path.
 */
export function parseComposeBuildSpecs(composeYaml: string): ComposeBuildSpec[] {
  const specs: ComposeBuildSpec[] = [];
  const lines = composeYaml.split(/\r?\n/);
  let inServices = false;
  let servicesIndent = -1;
  let inBuild = false;
  let buildIndent = -1;
  let current: {
    context?: string;
    dockerfile?: string;
    target?: string;
  } = {};

  function flush() {
    const rawCtx = current.context?.replace(/^\.\//, "") ?? "";
    if (rawCtx && rawCtx !== ".") {
      specs.push({
        context: normalizeBuildPath(rawCtx),
        dockerfile: current.dockerfile,
        target: current.target,
      });
    } else if (!rawCtx && current.dockerfile) {
      // dockerfile at root context — still useful as /
      specs.push({
        context: "/",
        dockerfile: current.dockerfile,
        target: current.target,
      });
    }
    current = {};
    inBuild = false;
    buildIndent = -1;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.search(/\S/);

    if (/^services:\s*$/.test(trimmed)) {
      if (inBuild) flush();
      inServices = true;
      servicesIndent = indent;
      continue;
    }

    if (inServices && indent <= servicesIndent && /^[\w.-]+:/.test(trimmed)) {
      if (inBuild) flush();
      inServices = false;
      continue;
    }
    if (!inServices) continue;

    // New service key under services
    if (
      indent > servicesIndent &&
      /^[\w.-]+:\s*$/.test(trimmed) &&
      !trimmed.startsWith("build")
    ) {
      // likely a service name — flush previous build block if any
      if (inBuild && indent <= buildIndent) {
        flush();
      }
    }

    if (/^build:\s*$/.test(trimmed)) {
      if (inBuild) flush();
      inBuild = true;
      buildIndent = indent;
      current = {};
      continue;
    }

    const buildInline = trimmed.match(
      /^build:\s*["']?(\.[^"'#]*|[^"'#\s{][^"'#]*?)["']?\s*$/
    );
    if (buildInline) {
      if (inBuild) flush();
      const value = buildInline[1].trim().replace(/^\.\//, "");
      if (value && value !== ".") {
        specs.push({ context: normalizeBuildPath(value) });
      }
      continue;
    }

    if (inBuild && indent <= buildIndent) {
      flush();
    }

    if (!inBuild) continue;

    const contextMatch = trimmed.match(/^context:\s*["']?([^"'#]+?)["']?\s*$/);
    if (contextMatch) {
      current.context = contextMatch[1].trim();
      continue;
    }

    const dockerfileMatch = trimmed.match(
      /^dockerfile:\s*["']?([^"'#]+?)["']?\s*$/
    );
    if (dockerfileMatch) {
      current.dockerfile = dockerfileMatch[1].trim().replace(/^\.\//, "");
      continue;
    }

    const targetMatch = trimmed.match(/^target:\s*["']?([^"'#]+?)["']?\s*$/);
    if (targetMatch) {
      current.target = targetMatch[1].trim();
    }
  }

  if (inBuild) flush();
  return specs;
}

/** @deprecated Use parseComposeBuildSpecs — kept for callers that only need paths. */
export function parseComposeContexts(composeYaml: string): string[] {
  return [
    ...new Set(
      parseComposeBuildSpecs(composeYaml)
        .map((s) => s.context)
        .filter((c) => c !== "/")
    ),
  ];
}

export function selectDefaultTarget(targets: DeployTarget[]): string | null {
  if (targets.length === 0) return null;
  const sorted = [...targets].sort((a, b) => b.confidence - a.confidence);
  return sorted[0]?.id ?? null;
}

export function rankTargets(targets: DeployTarget[]): DeployTarget[] {
  return [...targets].sort((a, b) => b.confidence - a.confidence);
}

export function detectLayout(
  targets: DeployTarget[],
  hadCompose: boolean
): RepoLayout {
  if (hadCompose && targets.length > 0) return "compose";
  if (targets.length > 1) return "monorepo";
  if (targets.length === 1 && targets[0].buildPath !== "/") return "monorepo";
  return "single";
}
