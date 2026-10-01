type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Sweep expired buckets once the map grows past this size. */
const SWEEP_THRESHOLD = 5_000;

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

/**
 * In-memory fixed-window limiter (per process). Counters reset when the
 * process restarts and are not shared across replicas; move to a shared store
 * before running more than one panel instance.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) sweepExpired(now);

  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true };
}

/**
 * Applies every limit and fails on the first one exhausted. Use it to pair a
 * per-account limit (which an attacker cannot reset by changing address) with
 * a per-address one.
 */
export function checkRateLimits(
  rules: Array<{ key: string; limit: number; windowMs: number }>
): { ok: true } | { ok: false; retryAfterSec: number } {
  for (const rule of rules) {
    const result = checkRateLimit(rule.key, rule.limit, rule.windowMs);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

/** Proxies that append to X-Forwarded-For in front of the panel (Traefik = 1). */
function trustedProxyHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

/**
 * Client address as seen by the outermost trusted proxy. Each proxy appends
 * the peer it saw, so entries to the left of the trusted hops are supplied by
 * the client and must never be used.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    // Fewer entries than hops means every entry was added by a trusted proxy.
    const ip = entries[Math.max(0, entries.length - trustedProxyHops())];
    if (ip) return ip;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function getClientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}
