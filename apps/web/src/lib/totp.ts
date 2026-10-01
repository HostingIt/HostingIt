import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";

const ALGORITHM = "aes-256-gcm";
const V2_PREFIX = "v2.";
/** Full-length GCM tag; never accept a truncated one from a client-held cookie. */
const AUTH_TAG_LENGTH = 16;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return secret;
}

/**
 * Encryption subkey: HMAC(AUTH_SECRET, "hostingit:totp-secret-encryption"),
 * the same derivation as `purposeHmacKey` in signed-cookie.ts, so it is
 * distinct from every signing key and from Auth.js's own keys.
 */
function getEncryptionKey(): Buffer {
  return createHmac("sha256", authSecret())
    .update("hostingit:totp-secret-encryption")
    .digest();
}

/** Key used before per-purpose derivation; kept only to read old rows. */
function getLegacyEncryptionKey(): Buffer {
  return createHash("sha256").update(authSecret()).digest();
}

export function encryptSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${V2_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

/** True for values written before v2; re-encrypt them when next decrypted. */
export function isLegacyEncryptedSecret(stored: string): boolean {
  return !stored.startsWith(V2_PREFIX);
}

export function decryptSecret(stored: string): string {
  const legacy = isLegacyEncryptedSecret(stored);
  const key = legacy ? getLegacyEncryptionKey() : getEncryptionKey();
  const body = legacy ? stored : stored.slice(V2_PREFIX.length);
  const [ivB64, tagB64, dataB64, extra] = body.split(".");
  if (!ivB64 || !tagB64 || !dataB64 || extra !== undefined) {
    throw new Error("Invalid encrypted secret format");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8"
  );
}

export function createTotpEnrollment(email: string) {
  const secret = generateSecret();
  const issuer = "HostingIt";
  const otpauthUrl = generateURI({
    issuer,
    label: email,
    secret,
  });
  return { secret, otpauthUrl };
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const result = verifySync({ secret, token: code });
  return result.valid;
}

/** Last accepted TOTP time step per user, to stop a code being used twice. */
const lastAcceptedTimeStep = new Map<string, number>();
const MAX_TRACKED_USERS = 10_000;

/**
 * Verifies a code for a user and rejects any code at or before the last time
 * step this user already used. A replayed code is only useful within its
 * ~30 s window, so in-memory tracking covers it.
 */
export function verifyTotpCodeOnce(
  userId: string,
  secret: string,
  code: string
): boolean {
  const after = lastAcceptedTimeStep.get(userId);
  let result: ReturnType<typeof verifySync>;
  try {
    result = verifySync({
      secret,
      token: code,
      ...(after !== undefined ? { afterTimeStep: after } : {}),
    });
  } catch {
    // otplib throws when afterTimeStep falls outside the accepted window.
    return false;
  }
  if (!result.valid) return false;

  if ("timeStep" in result) {
    if (lastAcceptedTimeStep.size >= MAX_TRACKED_USERS) {
      // Entries only matter for ~30 s; dropping the oldest is safe.
      const oldest = lastAcceptedTimeStep.keys().next().value;
      if (oldest !== undefined) lastAcceptedTimeStep.delete(oldest);
    }
    lastAcceptedTimeStep.delete(userId);
    lastAcceptedTimeStep.set(userId, result.timeStep);
  }
  return true;
}

/** HttpOnly cookie holding encrypted TOTP secret until enrollment completes. */
export const PENDING_TOTP_COOKIE = "pending_totp_secret";
export const PENDING_TOTP_MAX_AGE_SEC = 600;

type PendingTotpPayload = { uid: string; exp: number; secret: string };

/**
 * Encrypts a pending TOTP secret bound to the user it was issued for, so a
 * cookie minted for one account cannot complete enrollment on another.
 */
export function encryptPendingSecret(userId: string, secret: string): string {
  const payload: PendingTotpPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + PENDING_TOTP_MAX_AGE_SEC,
    secret,
  };
  return encryptSecret(JSON.stringify(payload));
}

/** Returns the pending secret, or null if it belongs to another user or expired. */
export function decryptPendingSecret(
  stored: string,
  userId: string
): string | null {
  let payload: Partial<PendingTotpPayload>;
  try {
    payload = JSON.parse(decryptSecret(stored)) as Partial<PendingTotpPayload>;
  } catch {
    return null;
  }
  if (
    typeof payload?.uid !== "string" ||
    typeof payload.exp !== "number" ||
    typeof payload.secret !== "string" ||
    payload.uid !== userId ||
    payload.exp < Math.floor(Date.now() / 1000)
  ) {
    return null;
  }
  return payload.secret;
}
