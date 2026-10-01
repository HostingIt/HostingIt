import { findUnsafeBuildField, isSafeRepoPath, isValidGitBranch } from "./validation";

export * from "./validation";

export class DokployError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "DokployError";
  }
}

function unsafeBuildConfigError(field: string): DokployError {
  return new DokployError(
    `Invalid build setting: ${field} contains unsupported characters`,
    400,
    "UNSAFE_BUILD_CONFIG"
  );
}

export interface DokployClientConfig {
  baseUrl: string;
  apiKey: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface Project {
  projectId: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  environments?: Array<{ environmentId: string; name?: string; isDefault?: boolean }>;
}

export interface CreateProjectResult {
  projectId: string;
  environmentId: string;
  name: string;
  description?: string | null;
}

export interface CreateApplicationInput {
  name: string;
  environmentId: string;
  appName?: string;
  description?: string | null;
  serverId?: string | null;
}

export type BuildType =
  | "nixpacks"
  | "dockerfile"
  | "static"
  | "heroku_buildpacks"
  | "paketo_buildpacks"
  | "railpack";

export type ApplicationStatus = "running" | "done" | "idle" | "error" | string;

export interface Application {
  applicationId: string;
  name: string;
  appName?: string;
  environmentId?: string;
  buildType?: BuildType;
  buildPath?: string | null;
  branch?: string | null;
  owner?: string | null;
  repository?: string | null;
  env?: string | null;
  buildArgs?: string | null;
  buildSecrets?: string | null;
  autoDeploy?: boolean | null;
  dockerfile?: string | null;
  dockerContextPath?: string | null;
  dockerBuildStage?: string | null;
  publishDirectory?: string | null;
  isStaticSpa?: boolean | null;
  applicationStatus?: ApplicationStatus;
  customGitUrl?: string | null;
  customGitBranch?: string | null;
  customGitBuildPath?: string | null;
  /** Docker memory hard limit in bytes, stored as a string. */
  memoryLimit?: string | null;
  memoryReservation?: string | null;
  /** Docker CPU limit in nanoCPUs (1 vCPU = 1e9), stored as a string. */
  cpuLimit?: string | null;
  cpuReservation?: string | null;
  replicas?: number | null;
}

export interface SaveEnvironmentInput {
  applicationId: string;
  env: string | null;
  buildArgs?: string | null;
  buildSecrets?: string | null;
  createEnvFile?: boolean;
}

export interface SaveBuildTypeInput {
  applicationId: string;
  buildType: BuildType;
  dockerfile?: string | null;
  dockerContextPath?: string | null;
  dockerBuildStage?: string | null;
  herokuVersion?: string | null;
  railpackVersion?: string | null;
  publishDirectory?: string | null;
  isStaticSpa?: boolean | null;
}

export interface UpdateApplicationInput {
  applicationId: string;
  autoDeploy?: boolean;
  name?: string;
  memoryLimit?: string | null;
  memoryReservation?: string | null;
  cpuLimit?: string | null;
  cpuReservation?: string | null;
}

export interface SaveGithubProviderInput {
  applicationId: string;
  repository: string;
  owner: string;
  branch: string;
  buildPath?: string;
  /** Dokploy GitHub *provider* id (from github.githubProviders), not a GitHub repo id */
  githubId?: string | null;
  triggerType?: "push" | "tag";
}

export interface GithubProvider {
  githubId: string;
  name?: string;
}

export interface DeployInput {
  applicationId: string;
  title?: string;
  description?: string;
}

export interface CreateDomainInput {
  host: string;
  applicationId: string;
  port?: number | null;
  https?: boolean;
  certificateType?: "letsencrypt" | "none";
}

export interface UpdateDomainInput {
  domainId: string;
  host: string;
  port?: number | null;
}

export interface Domain {
  domainId: string;
  host: string;
  applicationId?: string;
}

export interface Deployment {
  deploymentId: string;
  title?: string | null;
  description?: string | null;
  status: "running" | "done" | "error" | "cancelled" | string;
  logPath?: string | null;
  errorMessage?: string | null;
  applicationId?: string;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export type LogSince = "all" | `${number}${"s" | "m" | "h" | "d"}`;

/** One Swarm task from `docker service ps` (Dokploy calls the task id `containerId`). */
export interface ServiceTask {
  containerId: string;
  name?: string;
  state?: string;
  currentState?: string;
  node?: string;
  error?: string;
}

export interface AppMonitoringPoint {
  value: number | string;
  time: string;
}

export interface AppMonitoring {
  cpu?: AppMonitoringPoint[];
  memory?: AppMonitoringPoint[];
  disk?: AppMonitoringPoint[];
  network?: AppMonitoringPoint[];
  block?: AppMonitoringPoint[];
}

export class DokployClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: DokployClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit & { timeoutMs?: number } = {}
  ): Promise<T> {
    const { timeoutMs, ...init } = options;
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, {
      ...init,
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...init.headers,
      },
    });

    const text = await response.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const err = data as { message?: string; code?: string; error?: { message?: string; code?: string } };
      throw new DokployError(
        err.error?.message ?? err.message ?? `Dokploy request failed: ${response.status}`,
        response.status,
        err.error?.code ?? err.code
      );
    }

    return data as T;
  }

  async healthCheck(): Promise<{ ok: boolean }> {
    try {
      await this.request("/api/project.all", { method: "GET" });
      return { ok: true };
    } catch (error) {
      if (error instanceof DokployError && error.statusCode === 401) {
        return { ok: true };
      }
      throw error;
    }
  }

  async listProjects(): Promise<Project[]> {
    const data = await this.request<Project[] | { result?: Project[] }>(
      "/api/project.all",
      { method: "GET" }
    );
    if (Array.isArray(data)) return data;
    return data.result ?? [];
  }

  async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
    const data = await this.request<
      | CreateProjectResult
      | Project
      | {
          project?: Project;
          environment?: { environmentId: string };
          result?: { data?: Project & { environmentId?: string } };
        }
    >("/api/project.create", {
      method: "POST",
      body: JSON.stringify(input),
    });

    const nested = data as {
      project?: Project;
      environment?: { environmentId: string };
    };
    if (nested.project?.projectId && nested.environment?.environmentId) {
      return {
        projectId: nested.project.projectId,
        environmentId: nested.environment.environmentId,
        name: nested.project.name,
        description: nested.project.description,
      };
    }

    const flat = data as Project & { environmentId?: string };
    if (flat.projectId) {
      return {
        projectId: flat.projectId,
        environmentId: flat.environmentId ?? "",
        name: flat.name,
        description: flat.description,
      };
    }

    const wrapped = data as { result?: { data?: Project & { environmentId?: string } } };
    if (wrapped.result?.data?.projectId) {
      const project = wrapped.result.data;
      return {
        projectId: project.projectId,
        environmentId: project.environmentId ?? "",
        name: project.name,
        description: project.description,
      };
    }

    throw new DokployError("Unexpected project.create response shape", 500);
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(`/api/project.one?projectId=${encodeURIComponent(projectId)}`, {
      method: "GET",
    });
  }

  /** Permanently removes a project and all environments, apps, and related data. */
  async deleteProject(projectId: string): Promise<void> {
    await this.request("/api/project.remove", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });
  }

  async createApplication(input: CreateApplicationInput): Promise<Application> {
    const data = await this.request<Application | { applicationId?: string }>(
      "/api/application.create",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    if ("applicationId" in data) return data as Application;
    return data as Application;
  }

  async getApplication(applicationId: string): Promise<Application> {
    return this.request(`/api/application.one?applicationId=${encodeURIComponent(applicationId)}`, {
      method: "GET",
    });
  }

  async saveEnvironment(input: SaveEnvironmentInput): Promise<boolean> {
    return this.request<boolean>("/api/application.saveEnvironment", {
      method: "POST",
      body: JSON.stringify({
        applicationId: input.applicationId,
        env: input.env,
        buildArgs: input.buildArgs ?? null,
        buildSecrets: input.buildSecrets ?? null,
        createEnvFile: input.createEnvFile ?? true,
      }),
    });
  }

  async saveBuildType(input: SaveBuildTypeInput): Promise<boolean> {
    const unsafe = findUnsafeBuildField(input);
    if (unsafe) throw unsafeBuildConfigError(unsafe);
    return this.request<boolean>("/api/application.saveBuildType", {
      method: "POST",
      body: JSON.stringify({
        applicationId: input.applicationId,
        buildType: input.buildType,
        dockerfile: input.dockerfile ?? null,
        dockerContextPath: input.dockerContextPath ?? null,
        dockerBuildStage: input.dockerBuildStage ?? null,
        herokuVersion: input.herokuVersion ?? null,
        railpackVersion: input.railpackVersion ?? null,
        publishDirectory: input.publishDirectory ?? null,
        isStaticSpa: input.isStaticSpa ?? null,
      }),
    });
  }

  async updateApplication(input: UpdateApplicationInput): Promise<boolean> {
    return this.request<boolean>("/api/application.update", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listGithubProviders(): Promise<GithubProvider[]> {
    const data = await this.request<
      Array<{
        githubId: string;
        gitProvider?: { name?: string };
      }>
    >("/api/github.githubProviders", { method: "GET" });

    if (!Array.isArray(data)) return [];
    return data.map((provider) => ({
      githubId: provider.githubId,
      name: provider.gitProvider?.name,
    }));
  }

  async saveGithubProvider(input: SaveGithubProviderInput): Promise<void> {
    await this.request("/api/application.saveGithubProvider", {
      method: "POST",
      body: JSON.stringify({
        applicationId: input.applicationId,
        repository: input.repository,
        owner: input.owner,
        branch: input.branch,
        githubId: input.githubId ?? null,
        buildPath: input.buildPath ?? "/",
        triggerType: input.triggerType ?? "push",
      }),
    });
  }

  async saveGitProvider(input: {
    applicationId: string;
    customGitUrl: string;
    customGitBranch: string;
    customGitBuildPath?: string | null;
    customGitSSHKeyId?: string | null;
    enableSubmodules?: boolean;
    watchPaths?: string[] | null;
  }): Promise<boolean> {
    const buildPath = input.customGitBuildPath ?? "/";
    if (!isSafeRepoPath(buildPath)) throw unsafeBuildConfigError("buildPath");
    if (!isValidGitBranch(input.customGitBranch)) {
      throw unsafeBuildConfigError("branch");
    }
    return this.request<boolean>("/api/application.saveGitProvider", {
      method: "POST",
      body: JSON.stringify({
        applicationId: input.applicationId,
        customGitUrl: input.customGitUrl,
        customGitBranch: input.customGitBranch,
        customGitBuildPath: buildPath,
        customGitSSHKeyId: input.customGitSSHKeyId ?? null,
        enableSubmodules: input.enableSubmodules ?? false,
        watchPaths: input.watchPaths ?? [buildPath],
      }),
    });
  }

  /**
   * Refuses to build when the stored settings are unsafe, which also covers
   * values saved before input validation existed.
   */
  private async assertSafeStoredBuildConfig(applicationId: string): Promise<void> {
    const app = await this.getApplication(applicationId);
    const unsafe = findUnsafeBuildField(app);
    if (unsafe) throw unsafeBuildConfigError(unsafe);
  }

  async deploy(input: DeployInput): Promise<{ success: boolean }> {
    await this.assertSafeStoredBuildConfig(input.applicationId);
    return this.request("/api/application.deploy", {
      method: "POST",
      body: JSON.stringify({
        applicationId: input.applicationId,
        title: input.title ?? "Manual deployment",
        description: input.description,
      }),
    });
  }

  async redeploy(applicationId: string): Promise<{ success: boolean }> {
    await this.assertSafeStoredBuildConfig(applicationId);
    return this.request("/api/application.redeploy", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });
  }

  /**
   * Re-creates the Swarm service from the stored config (limits, env, replicas)
   * without rebuilding the image. Dokploy requires both ids.
   */
  async reload(input: {
    applicationId: string;
    appName: string;
  }): Promise<boolean> {
    return this.request<boolean>("/api/application.reload", {
      method: "POST",
      body: JSON.stringify({
        applicationId: input.applicationId,
        appName: input.appName,
      }),
    });
  }

  async deleteApplication(applicationId: string): Promise<void> {
    await this.request("/api/application.delete", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });
  }

  async createDomain(input: CreateDomainInput): Promise<Domain> {
    const data = await this.request<Domain>("/api/domain.create", {
      method: "POST",
      body: JSON.stringify({
        host: input.host,
        applicationId: input.applicationId,
        port: input.port ?? undefined,
        https: input.https ?? true,
        certificateType: input.certificateType ?? "letsencrypt",
      }),
    });
    return data;
  }

  async updateDomain(input: UpdateDomainInput): Promise<void> {
    await this.request("/api/domain.update", {
      method: "POST",
      body: JSON.stringify({
        domainId: input.domainId,
        host: input.host,
        port: input.port ?? undefined,
      }),
    });
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.request("/api/domain.delete", {
      method: "POST",
      body: JSON.stringify({ domainId }),
    });
  }

  async listDeployments(applicationId: string): Promise<Deployment[]> {
    const data = await this.request<Deployment[] | { result?: Deployment[] }>(
      `/api/deployment.all?applicationId=${encodeURIComponent(applicationId)}`,
      { method: "GET" }
    );
    if (Array.isArray(data)) return data;
    return data.result ?? [];
  }

  async getDeploymentLogs(deploymentId: string, tail?: number): Promise<string> {
    try {
      const params = new URLSearchParams({ deploymentId });
      if (tail) params.set("tail", String(tail));
      const data = await this.request<{ logs?: string } | string>(
        `/api/deployment.readLogs?${params.toString()}`,
        { method: "GET" }
      );
      if (typeof data === "string") return data;
      return data.logs ?? "";
    } catch {
      return "";
    }
  }

  async getApplicationLogs(
    applicationId: string,
    options?: { tail?: number; since?: LogSince; search?: string }
  ): Promise<string> {
    try {
      const params = new URLSearchParams({ applicationId });
      if (options?.tail) params.set("tail", String(options.tail));
      if (options?.since && options.since !== "all") params.set("since", options.since);
      if (options?.search) params.set("search", options.search);
      const data = await this.request<{ logs?: string } | string>(
        `/api/application.readLogs?${params.toString()}`,
        { method: "GET" }
      );
      if (typeof data === "string") return data;
      return data.logs ?? "";
    } catch {
      return "";
    }
  }

  async startApplication(applicationId: string): Promise<boolean> {
    return this.request<boolean>("/api/application.start", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });
  }

  async stopApplication(applicationId: string): Promise<boolean> {
    return this.request<boolean>("/api/application.stop", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });
  }

  async cancelDeployment(applicationId: string): Promise<boolean> {
    return this.request<boolean>("/api/application.cancelDeployment", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });
  }

  /** Swarm tasks for a service. Best-effort: older Dokploy builds may not expose it. */
  async getServiceTasks(appName: string): Promise<ServiceTask[]> {
    const data = await this.request<ServiceTask[] | { result?: ServiceTask[] }>(
      `/api/docker.getServiceContainersByAppName?appName=${encodeURIComponent(appName)}`,
      { method: "GET", timeoutMs: 10_000 }
    );
    if (Array.isArray(data)) return data;
    return data.result ?? [];
  }

  /** Raw `docker inspect` JSON for a task or container id. */
  async inspect(id: string): Promise<unknown> {
    return this.request<unknown>(
      `/api/docker.getConfig?containerId=${encodeURIComponent(id)}`,
      { method: "GET", timeoutMs: 10_000 }
    );
  }

  async getAppMonitoring(appName: string): Promise<AppMonitoring | null> {
    try {
      const data = await this.request<AppMonitoring | { result?: AppMonitoring }>(
        `/api/application.readAppMonitoring?appName=${encodeURIComponent(appName)}`,
        { method: "GET" }
      );
      const monitoring =
        data && typeof data === "object" && "result" in data
          ? (data as { result?: AppMonitoring }).result
          : (data as AppMonitoring);
      return monitoring ?? null;
    } catch {
      return null;
    }
  }
}

export function createDokployClient(config?: Partial<DokployClientConfig>): DokployClient {
  const baseUrl = config?.baseUrl ?? process.env.DOKPLOY_API_URL;
  const apiKey = config?.apiKey ?? process.env.DOKPLOY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new DokployError("DOKPLOY_API_URL and DOKPLOY_API_KEY must be set");
  }

  return new DokployClient({ baseUrl, apiKey });
}
