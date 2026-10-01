import { createHmac } from "crypto";
import { resolveTxt as dnsResolveTxt } from "dns/promises";

export const DOMAIN_VERIFY_PREFIX = "_hostingit-verify";

/**
 * Per-purpose subkey: HMAC(AUTH_SECRET, "hostingit:<purpose>"), the same
 * derivation as `purposeHmacKey` in signed-cookie.ts, so values made for one
 * purpose can't be reused for another.
 */
function purposeKey(purpose: string): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`hostingit:${purpose}`).digest();
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Hostnames tenants must never claim: the platform base domain (panel apex and
 * every free-tier app subdomain live under it), plus the panel and Dokploy
 * hosts in case they sit elsewhere. All share one Traefik, so a tenant router
 * on any of these would intercept their traffic.
 */
export function reservedDomainRoots(
  env: Record<string, string | undefined> = process.env
): string[] {
  const roots = [
    env.NEXT_PUBLIC_BASE_DOMAIN?.trim().toLowerCase() || null,
    hostOf(env.NEXT_PUBLIC_APP_URL),
    hostOf(env.AUTH_URL),
    hostOf(env.DOKPLOY_API_URL),
  ];
  return [...new Set(roots.filter((r): r is string => Boolean(r)))];
}

export function isReservedDomain(domain: string, roots: string[]): boolean {
  const d = domain.toLowerCase();
  return roots.some((root) => d === root || d.endsWith(`.${root}`));
}

function tokenMessage(userId: string, domain: string): string {
  return `custom-domain:${userId}:${domain.toLowerCase()}`;
}

/** Per-user, per-domain token proving DNS control; stable so no storage is needed. */
export function domainVerificationToken(userId: string, domain: string): string {
  return createHmac("sha256", purposeKey("custom-domain-verification"))
    .update(tokenMessage(userId, domain))
    .digest("hex")
    .slice(0, 32);
}

/** Token issued before per-purpose keys; still accepted so published records keep working. */
function legacyDomainVerificationToken(userId: string, domain: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret)
    .update(tokenMessage(userId, domain))
    .digest("hex")
    .slice(0, 32);
}

export function domainVerificationRecord(userId: string, domain: string) {
  return {
    type: "TXT" as const,
    name: `${DOMAIN_VERIFY_PREFIX}.${domain.toLowerCase()}`,
    value: `hostingit-verify=${domainVerificationToken(userId, domain)}`,
  };
}

type ResolveTxt = (hostname: string) => Promise<string[][]>;

/** True when the domain publishes the expected verification TXT record. */
export async function isDomainVerified(
  userId: string,
  domain: string,
  resolveTxt: ResolveTxt = dnsResolveTxt
): Promise<boolean> {
  const { name, value } = domainVerificationRecord(userId, domain);
  const accepted = new Set([
    value,
    `hostingit-verify=${legacyDomainVerificationToken(userId, domain)}`,
  ]);
  try {
    const records = await resolveTxt(name);
    return records.some((chunks) => accepted.has(chunks.join("").trim()));
  } catch {
    return false;
  }
}
