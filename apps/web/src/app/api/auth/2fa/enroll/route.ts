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
import { setMfaStampCookie } from "@/lib/mfa-stamp";

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
    return NextResponse.json({ error: "2FA already enrolled" }, { status: 400 });
  }

  const { secret, otpauthUrl } = createTotpEnrollment(user.email);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 220,
    color: { dark: "#0b1220", light: "#ffffff" },
  });

  const cookieStore = await cookies();
  cookieStore.set(PENDING_COOKIE, encryptPendingSecret(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PENDING_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({
    qrDataUrl,
    otpauthUrl,
    manualKey: secret,
  });
}

const enrollSchema = z.object({
  code: z.string().length(6),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  await db
    .update(users)
    .set({
      totpSecret: encryptSecret(secret),
      totpEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  cookieStore.delete(PENDING_COOKIE);
  await setMfaStampCookie(session.user.id);

  return NextResponse.json({ success: true, mfaEnrolled: true, mfaVerified: true });
}
