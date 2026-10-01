/**
 * Tenant apps are served from subdomains of the panel's registrable domain,
 * which makes them *same-site* with the panel: SameSite=Lax cookies are sent
 * on their requests. So state-changing API calls must come from the panel's
 * exact origin, not merely the same site.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Hosts the panel is served from: the request's Host plus configured URLs. */
export function panelHosts(
  headers: Headers,
  env: Record<string, string | undefined> = process.env
): Set<string> {
  const hosts = [
    headers.get("host")?.toLowerCase() ?? null,
    hostOf(env.NEXT_PUBLIC_APP_URL),
    hostOf(env.AUTH_URL),
  ];
  return new Set(hosts.filter((h): h is string => Boolean(h)));
}

/**
 * True when a state-changing request was not issued by the panel itself.
 * Browsers send `Sec-Fetch-Site` and `Origin` on such requests; a request
 * with neither did not come from a browser, so it cannot carry a victim's
 * ambient cookies cross-site.
 */
export function isCrossOriginWrite(
  method: string,
  headers: Headers,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;

  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return true;
  }

  const origin = headers.get("origin");
  if (!origin) return false;
  const originHost = hostOf(origin);
  if (!originHost) return true;
  return !panelHosts(headers, env).has(originHost);
}
