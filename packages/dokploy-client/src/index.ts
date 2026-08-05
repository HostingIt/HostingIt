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
}

export interface CreateApplicationInput {
  name: string;
  environmentId: string;
  appName?: string;
  description?: string | null;
  serverId?: string | null;
}

export interface Application {
  applicationId: string;
  name: string;
  appName?: string;
  environmentId?: string;
}

export interface SaveGithubProviderInput {
  applicationId: string;
  repository: string;
  owner: string;
  branch: string;
  buildPath?: string;
  githubId?: string | null;
  triggerType?: "push" | "tag";
}

export interface DeployInput {
  applicationId: string;
  title?: string;
  description?: string;
}

export interface CreateDomainInput {
  host: string;
  applicationId: string;
  https?: boolean;
  certificateType?: "letsencrypt" | "none";
}

export interface Domain {
  domainId: string;
  host: string;
  applicationId?: string;
}

export interface DeploymentLog {
  message: string;
  timestamp?: string;
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
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...options.headers,
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

  async createProject(input: CreateProjectInput): Promise<Project> {
    const data = await this.request<Project | { result?: { data?: Project } }>(
      "/api/project.create",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    if ("projectId" in (data as Project)) return data as Project;
    const wrapped = data as { result?: { data?: Project } };
    if (wrapped.result?.data) return wrapped.result.data;
    return data as Project;
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(`/api/project.one?projectId=${encodeURIComponent(projectId)}`, {
      method: "GET",
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

  async getApplication(applicationId: string): Promise<Application & { status?: string }> {
    return this.request(`/api/application.one?applicationId=${encodeURIComponent(applicationId)}`, {
      method: "GET",
    });
  }

  async saveGithubProvider(input: SaveGithubProviderInput): Promise<void> {
    await this.request("/api/application.saveGithubProvider", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        buildPath: input.buildPath ?? "/",
        triggerType: input.triggerType ?? "push",
      }),
    });
  }

  async deploy(input: DeployInput): Promise<{ success: boolean }> {
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
    return this.request("/api/application.redeploy", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    });
  }

  async reload(applicationId: string): Promise<{ success: boolean }> {
    return this.request("/api/application.reload", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
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
        https: input.https ?? true,
        certificateType: input.certificateType ?? "letsencrypt",
      }),
    });
    return data;
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.request("/api/domain.delete", {
      method: "POST",
      body: JSON.stringify({ domainId }),
    });
  }

  async getDeploymentLogs(applicationId: string): Promise<DeploymentLog[]> {
    try {
      const data = await this.request<{ logs?: DeploymentLog[] } | DeploymentLog[]>(
        `/api/deployment.all?applicationId=${encodeURIComponent(applicationId)}`,
        { method: "GET" }
      );
      if (Array.isArray(data)) return data;
      return data.logs ?? [];
    } catch {
      return [];
    }
  }

  async getApplicationLogs(applicationId: string): Promise<string> {
    try {
      const data = await this.request<{ logs?: string } | string>(
        `/api/application.readLogs?applicationId=${encodeURIComponent(applicationId)}`,
        { method: "GET" }
      );
      if (typeof data === "string") return data;
      return data.logs ?? "";
    } catch {
      return "";
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
