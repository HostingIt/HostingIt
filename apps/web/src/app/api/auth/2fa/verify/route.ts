import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { decryptSecret, verifyTotpCode } from "@/lib/totp";

const verifySchema = z.object({
  code: z.string().length(6),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.totpSecret || !user.totpEnabled) {
    return NextResponse.json({ error: "2FA not enrolled" }, { status: 400 });
  }

  let secret: string;
  try {
    secret = decryptSecret(user.totpSecret);
  } catch {
    return NextResponse.json({ error: "2FA configuration error" }, { status: 500 });
  }

  if (!verifyTotpCode(secret, parsed.data.code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  return NextResponse.json({ success: true, mfaVerified: true });
}
