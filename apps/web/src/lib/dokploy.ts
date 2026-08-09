import { createDokployClient } from "@hostingit/dokploy-client";

let client: ReturnType<typeof createDokployClient> | null = null;

export function getDokployClient() {
  if (!client) {
    client = createDokployClient();
  }
  return client;
}

/** Apex domain, e.g. hostingit.online */
export function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "yourdomain.com";
}

/**
 * Free-tier label prefix for first-level subdomains.
 * Produces fhusr-{slug}.hostingit.online; allocated slugs include a unique suffix.
 */
export function getFreeSubdomainPrefix(): string {
  return process.env.NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX ?? "fhusr";
}

/** Leftmost label only, e.g. fhusr-my-api-a1b2c3d4e5f6 */
export function getFreeAppLabel(slug: string): string {
  const prefix = getFreeSubdomainPrefix();
  return `${prefix}-${slug}`;
}

/** Hostname only, e.g. fhusr-my-api-a1b2c3d4e5f6.hostingit.online */
export function getAppHostname(slug: string): string {
  return `${getFreeAppLabel(slug)}.${getBaseDomain()}`;
}

export function getAppUrl(slug: string): string {
  return `https://${getAppHostname(slug)}`;
}

/** Prefer custom domain, then stored hostname, then slug-derived free URL. */
export function getAppPublicUrl(app: {
  slug: string;
  subdomain: string;
  customDomain?: string | null;
}): string {
  if (app.customDomain) {
    return `https://${app.customDomain}`;
  }
  if (app.subdomain.includes(".")) {
    return `https://${app.subdomain}`;
  }
  return getAppUrl(app.slug);
}
