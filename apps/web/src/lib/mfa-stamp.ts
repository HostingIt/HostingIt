import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const MFA_STAMP_COOKIE = "hostingit_mfa";
const MAX_AGE_SEC = 60 * 60 * 12; // 12 hours

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

/** Signed proof that TOTP succeeded for this user (httpOnly cookie). */
export function createMfaStamp(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyMfaStamp(
  stamp: string | undefined,
  userId: string
): boolean {
  if (!stamp) return false;
  const parts = stamp.split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, sig] = parts;
  if (!uid || !expStr || !sig || uid !== userId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${uid}.${expStr}`;
  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function setMfaStampCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(MFA_STAMP_COOKIE, createMfaStamp(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
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
