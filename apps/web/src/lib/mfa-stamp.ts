import { cookies } from "next/headers";

export const MFA_STAMP_COOKIE = "hostingit_mfa";
const MAX_AGE_SEC = 60 * 60 * 12; // 12 hours

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

function cookieSecure(): boolean {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (authUrl.startsWith("https://")) return true;
  return process.env.NODE_ENV === "production";
}

export function mfaCookieOptions(maxAge = MAX_AGE_SEC) {
  return {
    httpOnly: true as const,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) {
    bin += String.fromCharCode(arr[i]!);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/** Edge + Node compatible HMAC-SHA256 (Web Crypto — no node:crypto). */
async function hmacSha256Base64Url(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return bytesToBase64Url(sig);
}

/** Signed proof that TOTP succeeded for this user. */
export async function createMfaStamp(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${userId}.${exp}`;
  const sig = await hmacSha256Base64Url(payload);
  return `${payload}.${sig}`;
}

export async function verifyMfaStamp(
  stamp: string | undefined,
  userId: string
): Promise<boolean> {
  if (!stamp) return false;
  const parts = stamp.split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, sig] = parts;
  if (!uid || !expStr || !sig || uid !== userId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${uid}.${expStr}`;
  const expected = await hmacSha256Base64Url(payload);
  return timingSafeEqualString(sig, expected);
}

export async function setMfaStampCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(MFA_STAMP_COOKIE, await createMfaStamp(userId), mfaCookieOptions());
}

export async function clearMfaStampCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(MFA_STAMP_COOKIE);
}

export async function readMfaStampVerified(userId: string): Promise<boolean> {
  try {
    const jar = await cookies();
    return verifyMfaStamp(jar.get(MFA_STAMP_COOKIE)?.value, userId);
  } catch {
    return false;
  }
}
