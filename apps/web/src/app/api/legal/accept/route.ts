import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import {
  LEGAL_CONSENT_COOKIE,
  consentTokenForNow,
  legalConsentCookieOptions,
} from "@/lib/legal-consent";

/**
 * Records acceptance of the Terms of Service and Privacy Policy.
 *
 * Signed-in callers (dashboard gate) get the acceptance written to their user
 * row. Signed-out callers (the signup popup) get a short-lived signed cookie
 * that the OAuth callback picks up when it creates the account.
 */
export async function POST() {
  const now = new Date();

  try {
    const session = await auth();

    if (session?.user?.id) {
      await db
        .update(users)
        .set({
          termsAcceptedAt: now,
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          updatedAt: now,
        })
        .where(eq(users.id, session.user.id));

      return NextResponse.json({ recorded: "account" });
    }

    const response = NextResponse.json({ recorded: "cookie" });
    response.cookies.set(
      LEGAL_CONSENT_COOKIE,
      await consentTokenForNow(),
      legalConsentCookieOptions()
    );
    return response;
  } catch (error) {
    console.error("Legal consent error:", error);
    return NextResponse.json(
      { error: "Could not record your acceptance. Try again." },
      { status: 500 }
    );
  }
}
