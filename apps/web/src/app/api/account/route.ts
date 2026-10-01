import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireApiUser } from "@/lib/api-auth";
import { deleteUserAccount } from "@/lib/delete-account";
import { MFA_STAMP_COOKIE, mfaCookieOptions } from "@/lib/mfa-stamp";
import {
  decryptSecret,
  verifyTotpCodeOnce,
  PENDING_TOTP_COOKIE,
} from "@/lib/totp";
import {
  checkRateLimits,
  clearRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

const deleteAccountSchema = z.object({
  confirmEmail: z.string().trim().min(1, "Email confirmation is required"),
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator"),
});

const DELETE_LIMIT = 3;
const DELETE_ACCOUNT_LIMIT = 5;
const DELETE_WINDOW_MS = 60 * 60 * 1000;

export async function DELETE(request: Request) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const rateKey = `delete-account:${authResult.user.id}:${getClientIp(request)}`;
  const accountKey = `delete-account:${authResult.user.id}`;
  const limited = checkRateLimits([
    { key: accountKey, limit: DELETE_ACCOUNT_LIMIT, windowMs: DELETE_WINDOW_MS },
    { key: rateKey, limit: DELETE_LIMIT, windowMs: DELETE_WINDOW_MS },
  ]);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many delete attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      totpSecret: users.totpSecret,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    user.email.trim().toLowerCase() !==
    parsed.data.confirmEmail.trim().toLowerCase()
  ) {
    return NextResponse.json(
      { error: "Email confirmation does not match your account." },
      { status: 400 }
    );
  }

  if (!user.totpSecret || !user.totpEnabled) {
    return NextResponse.json(
      { error: "2FA must be enabled to delete your account." },
      { status: 400 }
    );
  }

  let secret: string;
  try {
    secret = decryptSecret(user.totpSecret);
  } catch {
    return NextResponse.json(
      { error: "2FA configuration error" },
      { status: 500 }
    );
  }

  if (!verifyTotpCodeOnce(user.id, secret, parsed.data.totpCode)) {
    return NextResponse.json(
      { error: "Invalid authenticator code." },
      { status: 401 }
    );
  }

  try {
    await deleteUserAccount(user.id);
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Try again or contact support." },
      { status: 500 }
    );
  }

  clearRateLimit(rateKey);
  clearRateLimit(accountKey);

  const response = NextResponse.json({ success: true });
  response.cookies.set(MFA_STAMP_COOKIE, "", {
    ...mfaCookieOptions(0),
    maxAge: 0,
  });
  response.cookies.set(PENDING_TOTP_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
