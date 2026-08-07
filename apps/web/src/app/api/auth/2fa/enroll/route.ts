import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createTotpEnrollment,
  encryptSecret,
  encryptPendingSecret,
  decryptPendingSecret,
  verifyTotpCode,
} from "@/lib/totp";
import {
  MFA_STAMP_COOKIE,
  createMfaStamp,
  mfaCookieOptions,
} from "@/lib/mfa-stamp";
import {
  checkRateLimit,
  clearRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

const PENDING_COOKIE = "pending_totp_secret";
const PENDING_MAX_AGE = 600;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      email: users.email,
      totpEnabled: users.totpEnabled,
      totpSecret: users.totpSecret,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.totpEnabled && user.totpSecret) {
    return NextResponse.json({ alreadyEnrolled: true });
  }

  const { secret, otpauthUrl } = createTotpEnrollment(user.email);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 220,
    color: { dark: "#0b1220", light: "#ffffff" },
  });

  const response = NextResponse.json({
    qrDataUrl,
    otpauthUrl,
    manualKey: secret,
  });
  response.cookies.set(
    PENDING_COOKIE,
    encryptPendingSecret(secret),
    mfaCookieOptions(PENDING_MAX_AGE)
  );
  return response;
}

const enrollSchema = z.object({
  code: z.string().length(6),
});

const ENROLL_LIMIT = 5;
const ENROLL_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateKey = `totp-enroll:${session.user.id}:${getClientIp(request)}`;
  const limited = checkRateLimit(rateKey, ENROLL_LIMIT, ENROLL_WINDOW_MS);
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
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const pending = cookieStore.get(PENDING_COOKIE)?.value;
  if (!pending) {
    return NextResponse.json(
      { error: "Enrollment expired. Refresh and scan a new QR code." },
      { status: 400 }
    );
  }

  let secret: string;
  try {
    secret = decryptPendingSecret(pending);
  } catch {
    return NextResponse.json({ error: "Invalid enrollment state" }, { status: 400 });
  }

  if (!verifyTotpCode(secret, parsed.data.code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  clearRateLimit(rateKey);
  await db
    .update(users)
    .set({
      totpSecret: encryptSecret(secret),
      totpEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  const mfaProof = createMfaStamp(session.user.id);
  const response = NextResponse.json({
    success: true,
    mfaEnrolled: true,
    mfaVerified: true,
    mfaProof,
  });
  response.cookies.set(PENDING_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(MFA_STAMP_COOKIE, mfaProof, mfaCookieOptions());
  return response;
}
