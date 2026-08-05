import { createDokployClient } from "@hostingit/dokploy-client";

let client: ReturnType<typeof createDokployClient> | null = null;

export function getDokployClient() {
  if (!client) {
    client = createDokployClient();
  }
  return client;
}

export function getAppUrl(subdomain: string): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "yourdomain.com";
  return `https://${subdomain}.${baseDomain}`;
}
