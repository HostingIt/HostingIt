import type { DokployClient } from "@hostingit/dokploy-client";
import { githubFileText } from "@/lib/github-app";
import { parseEnvString } from "@/lib/env-vars";
import {
  dockerfileRepoPath,
  resolveContainerPort,
  STATIC_CONTAINER_PORT,
} from "@/lib/container-port";

export { STATIC_CONTAINER_PORT, DEFAULT_CONTAINER_PORT } from "@/lib/container-port";

export interface AppDomainIdentity {
  dokployDomainId: string | null;
  subdomain: string;
  customDomain: string | null;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
}

export async function fetchDockerfileText(input: {
  installationId?: string | null;
  owner: string;
  repo: string;
  branch: string;
  buildPath?: string | null;
  dockerfile?: string | null;
  dockerContextPath?: string | null;
}): Promise<string | null> {
  if (!input.installationId) return null;
  const path = dockerfileRepoPath({
    buildPath: input.buildPath,
    dockerfile: input.dockerfile,
    dockerContextPath: input.dockerContextPath,
  });
  try {
    return await githubFileText(
      input.installationId,
      input.owner,
      input.repo,
      path,
      input.branch
    );
  } catch {
    return null;
  }
}

export async function resolveAppContainerPort(input: {
  buildType?: string | null;
  envRaw?: string | null;
  dockerfileText?: string | null;
  portOverride?: number | null;
}): Promise<number> {
  return resolveContainerPort({
    buildType: input.buildType,
    env: parseEnvString(input.envRaw),
    dockerfileText: input.dockerfileText,
    override: input.portOverride,
  });
}

export async function ensureDomainPort(
  dokploy: DokployClient,
  app: Pick<AppDomainIdentity, "dokployDomainId" | "subdomain" | "customDomain">,
  port: number
) {
  if (!app.dokployDomainId) return;
  await dokploy.updateDomain({
    domainId: app.dokployDomainId,
    host: app.customDomain ?? app.subdomain,
    port,
  });
}

/** Detect listen port (PORT env, Dockerfile EXPOSE) and point the domain at it. */
export async function syncAppDomainPort(
  dokploy: DokployClient,
  app: AppDomainIdentity,
  opts: {
    buildType?: string | null;
    envRaw?: string | null;
    dockerfile?: string | null;
    dockerContextPath?: string | null;
    buildPath?: string | null;
    installationId?: string | null;
    portOverride?: number | null;
  } = {}
): Promise<number> {
  const dockerfileText =
    opts.portOverride != null || opts.buildType === "static"
      ? null
      : await fetchDockerfileText({
          installationId: opts.installationId,
          owner: app.githubOwner,
          repo: app.githubRepo,
          branch: app.githubBranch,
          buildPath: opts.buildPath,
          dockerfile: opts.dockerfile,
          dockerContextPath: opts.dockerContextPath,
        });

  const port = await resolveAppContainerPort({
    buildType: opts.buildType,
    envRaw: opts.envRaw,
    dockerfileText,
    portOverride: opts.portOverride,
  });

  await ensureDomainPort(dokploy, app, port);
  return port;
}

/** @deprecated Use syncAppDomainPort — kept for static-only call sites. */
export async function ensureStaticDomainPort(
  dokploy: DokployClient,
  app: AppDomainIdentity,
  buildType: string | null | undefined
) {
  if (buildType !== "static") return;
  await ensureDomainPort(dokploy, app, STATIC_CONTAINER_PORT);
}
