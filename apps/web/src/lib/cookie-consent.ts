export const COOKIE_CONSENT_COOKIE = "hostingit_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_MAX_AGE_DAYS = 180;

export type ConsentChoice = "all" | "essential";

export interface StoredCookieConsent {
  version: number;
  choice: ConsentChoice;
  decidedAt: string;
}

export function readCookieConsent(): StoredCookieConsent | null {
  if (typeof document === "undefined") return null;

  const prefix = `${COOKIE_CONSENT_COOKIE}=`;
  const raw = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<StoredCookieConsent>;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.choice !== "all" && parsed.choice !== "essential") return null;
    if (typeof parsed.decidedAt !== "string") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      choice: parsed.choice,
      decidedAt: parsed.decidedAt,
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(choice: ConsentChoice): StoredCookieConsent {
  const stored: StoredCookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    choice,
    decidedAt: new Date().toISOString(),
  };

  const maxAge = COOKIE_CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(stored)
  )}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;

  return stored;
}

/** Gate for anything non-essential, e.g. a future analytics script. */
export function hasConsent(category: "essential" | "analytics"): boolean {
  if (category === "essential") return true;
  return readCookieConsent()?.choice === "all";
}
