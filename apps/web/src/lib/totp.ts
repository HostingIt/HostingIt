import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(stored: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, dataB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret format");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
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

export function encryptPendingSecret(secret: string): string {
  return encryptSecret(secret);
}

export function decryptPendingSecret(stored: string): string {
  return decryptSecret(stored);
}

/** HttpOnly cookie holding encrypted TOTP secret until enrollment completes. */
export const PENDING_TOTP_COOKIE = "pending_totp_secret";
