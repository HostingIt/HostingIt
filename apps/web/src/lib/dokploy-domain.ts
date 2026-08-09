import type { DokployClient } from "@hostingit/dokploy-client";

export const STATIC_CONTAINER_PORT = 80;

interface AppDomainIdentity {
  dokployDomainId: string | null;
  subdomain: string;
  customDomain: string | null;
}

/** Keep static-app domains routed to the Nginx container port. */
export async function ensureStaticDomainPort(
  dokploy: DokployClient,
  app: AppDomainIdentity,
  buildType: string | null | undefined
) {
  if (buildType !== "static" || !app.dokployDomainId) return;

  await dokploy.updateDomain({
    domainId: app.dokployDomainId,
    host: app.customDomain ?? app.subdomain,
    port: STATIC_CONTAINER_PORT,
  });
}
