function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

export function cookieSecure(): boolean {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (authUrl.startsWith("https://")) return true;
  return process.env.NODE_ENV === "production";
}

export function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) {
    bin += String.fromCharCode(arr[i]!);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function utf8ToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

export function base64UrlToUtf8(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const bin = atob(normalized + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export type SigningPurpose = "mfa-stamp" | "legal-consent";

async function importHmacKey(raw: BufferSource): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Per-purpose subkey: HMAC(AUTH_SECRET, "hostingit:<purpose>"). Matches
 * `purposeKey` in purpose-key.ts, which Node-only code uses.
 */
async function purposeHmacKey(purpose: SigningPurpose): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const root = await importHmacKey(enc.encode(secret()));
  const derived = await crypto.subtle.sign(
    "HMAC",
    root,
    enc.encode(`hostingit:${purpose}`)
  );
  return importHmacKey(derived);
}

/** Edge + Node compatible HMAC-SHA256 (Web Crypto — no node:crypto). */
export async function hmacSha256Base64Url(
  payload: string,
  purpose: SigningPurpose
): Promise<string> {
  const key = await purposeHmacKey(purpose);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return bytesToBase64Url(sig);
}

export interface ConsentPayload {
  acceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
}

/** A consent token is only meaningful for the sign-in that follows it. */
export const CONSENT_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export async function createConsentToken(
  payload: ConsentPayload
): Promise<string> {
  const body = utf8ToBase64Url(JSON.stringify(payload));
  return `${body}.${await hmacSha256Base64Url(body, "legal-consent")}`;
}

export async function verifyConsentToken(
  token: string | undefined
): Promise<ConsentPayload | null> {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!body || !signature) return null;

  const expected = await hmacSha256Base64Url(body, "legal-consent");
  if (!timingSafeEqualString(signature, expected)) return null;

  const json = base64UrlToUtf8(body);
  if (!json) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const { acceptedAt, termsVersion, privacyVersion } = parsed as Record<
    string,
    unknown
  >;
  if (
    typeof acceptedAt !== "string" ||
    typeof termsVersion !== "string" ||
    typeof privacyVersion !== "string"
  ) {
    return null;
  }

  const acceptedAtMs = Date.parse(acceptedAt);
  if (!Number.isFinite(acceptedAtMs)) return null;

  const age = Date.now() - acceptedAtMs;
  if (age > CONSENT_TOKEN_MAX_AGE_MS || age < -CLOCK_SKEW_MS) return null;

  return { acceptedAt, termsVersion, privacyVersion };
}
