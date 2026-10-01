import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  decryptSecret,
  encryptSecret,
  isLegacyEncryptedSecret,
  verifyTotpCodeOnce,
} from "@/lib/totp";
import {
  MFA_STAMP_COOKIE,
  createMfaStamp,
  mfaCookieOptions,
} from "@/lib/mfa-stamp";
import {
  checkRateLimits,
  clearRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";

const verifySchema = z.object({
  code: z.string().length(6),
});

const VERIFY_LIMIT = 5;
/** Per-account cap that holds however many addresses the attempts come from. */
const VERIFY_ACCOUNT_LIMIT = 10;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateKey = `totp-verify:${session.user.id}:${getClientIp(request)}`;
  const accountKey = `totp-verify:${session.user.id}`;
  const limited = checkRateLimits([
    { key: accountKey, limit: VERIFY_ACCOUNT_LIMIT, windowMs: VERIFY_WINDOW_MS },
    { key: rateKey, limit: VERIFY_LIMIT, windowMs: VERIFY_WINDOW_MS },
  ]);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const body = await request.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const [user] = await db
    .select({
      totpSecret: users.totpSecret,
      totpEnabled: users.totpEnabled,
      accountStatus: users.accountStatus,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (user?.accountStatus === "suspended") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  if (!user?.totpSecret || !user.totpEnabled) {
    return NextResponse.json({ error: "2FA not enrolled" }, { status: 400 });
  }

  let secret: string;
  try {
    secret = decryptSecret(user.totpSecret);
  } catch {
    return NextResponse.json({ error: "2FA configuration error" }, { status: 500 });
  }

  if (!verifyTotpCodeOnce(session.user.id, secret, parsed.data.code)) {
    recordAuditEvent({
      userId: session.user.id,
      action: AUDIT_ACTIONS.authTwoFactorVerifyFailed,
      request,
    });
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  clearRateLimit(rateKey);
  clearRateLimit(accountKey);

  // Move secrets written under the old shared key onto the derived key.
  if (isLegacyEncryptedSecret(user.totpSecret)) {
    try {
      await db
        .update(users)
        .set({ totpSecret: encryptSecret(secret), updatedAt: new Date() })
        .where(
          and(
            eq(users.id, session.user.id),
            eq(users.totpSecret, user.totpSecret)
          )
        );
    } catch (error) {
      console.error("TOTP secret re-encryption failed:", error);
    }
  }

  const mfaProof = await createMfaStamp(session.user.id);
  const response = NextResponse.json({
    success: true,
    mfaVerified: true,
    mfaProof,
  });
  response.cookies.set(MFA_STAMP_COOKIE, mfaProof, mfaCookieOptions());
  return response;
}
