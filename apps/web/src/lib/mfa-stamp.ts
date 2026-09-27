import { cookies } from "next/headers";
import {
  cookieSecure,
  hmacSha256Base64Url,
  timingSafeEqualString,
} from "@/lib/signed-cookie";

export const MFA_STAMP_COOKIE = "hostingit_mfa";
const MAX_AGE_SEC = 60 * 60 * 12; // 12 hours

export function mfaCookieOptions(maxAge = MAX_AGE_SEC) {
  return {
    httpOnly: true as const,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
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
