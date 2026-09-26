import { cookies } from "next/headers";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import {
  cookieSecure,
  createConsentToken,
  verifyConsentToken,
  type ConsentPayload,
} from "@/lib/signed-cookie";

export const LEGAL_CONSENT_COOKIE = "hostingit_legal_consent";
export const LEGAL_CONSENT_MAX_AGE = 60 * 30; // 30 minutes

export function legalConsentCookieOptions(maxAge = LEGAL_CONSENT_MAX_AGE) {
  return {
    httpOnly: true as const,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function currentConsentPayload(): ConsentPayload {
  return {
    acceptedAt: new Date().toISOString(),
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  };
}

export function consentTokenForNow(): Promise<string> {
  return createConsentToken(currentConsentPayload());
}

/**
 * Reads the pre-signup consent handed over from the OAuth redirect. Returns null
 * when the cookie is missing, tampered with, expired, or was signed against an
 * older version of the documents.
 */
export async function readConsentCookie(): Promise<ConsentPayload | null> {
  try {
    const jar = await cookies();
    const payload = await verifyConsentToken(
      jar.get(LEGAL_CONSENT_COOKIE)?.value
    );
    if (!payload) return null;
    if (
      payload.termsVersion !== TERMS_VERSION ||
      payload.privacyVersion !== PRIVACY_VERSION
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
