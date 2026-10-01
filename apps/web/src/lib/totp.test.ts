import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "crypto";
import { generateSecret, generateSync } from "otplib";
import {
  PENDING_TOTP_MAX_AGE_SEC,
  decryptPendingSecret,
  decryptSecret,
  encryptPendingSecret,
  encryptSecret,
  isLegacyEncryptedSecret,
  verifyTotpCodeOnce,
} from "./totp.ts";

process.env.AUTH_SECRET = "test-secret-for-pending-totp";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const SECRET = "JBSWY3DPEHPK3PXP";

describe("pending TOTP secret cookie", () => {
  it("round-trips for the user it was issued to", () => {
    const cookie = encryptPendingSecret(USER_A, SECRET);
    assert.equal(decryptPendingSecret(cookie, USER_A), SECRET);
  });

  it("rejects a cookie issued to a different user", () => {
    const cookie = encryptPendingSecret(USER_B, SECRET);
    assert.equal(decryptPendingSecret(cookie, USER_A), null);
  });

  it("rejects an expired cookie", () => {
    const cookie = encryptPendingSecret(USER_A, SECRET);
    const now = Date.now();
    mock.timers.enable({ apis: ["Date"], now: now + (PENDING_TOTP_MAX_AGE_SEC + 5) * 1000 });
    try {
      assert.equal(decryptPendingSecret(cookie, USER_A), null);
    } finally {
      mock.timers.reset();
    }
  });

  it("rejects legacy unbound cookies and tampered values", () => {
    assert.equal(decryptPendingSecret(encryptSecret(SECRET), USER_A), null);
    assert.equal(decryptPendingSecret("not.a.cookie", USER_A), null);
    const cookie = encryptPendingSecret(USER_A, SECRET);
    const tampered = cookie.slice(0, -2) + (cookie.endsWith("A") ? "BB" : "AA");
    assert.equal(decryptPendingSecret(tampered, USER_A), null);
  });
});

/** Ciphertext in the pre-v2 format: sha256(AUTH_SECRET) key, three parts. */
function legacyEncrypt(plain: string): string {
  const key = createHash("sha256").update(process.env.AUTH_SECRET!).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

describe("TOTP secret encryption", () => {
  it("writes the v2 format and round-trips", () => {
    const stored = encryptSecret(SECRET);
    assert.ok(stored.startsWith("v2."));
    assert.equal(isLegacyEncryptedSecret(stored), false);
    assert.equal(decryptSecret(stored), SECRET);
  });

  it("still decrypts secrets written with the legacy key", () => {
    const legacy = legacyEncrypt(SECRET);
    assert.equal(isLegacyEncryptedSecret(legacy), true);
    assert.equal(decryptSecret(legacy), SECRET);
  });

  it("does not decrypt a v2 value with the legacy key or vice versa", () => {
    const legacy = legacyEncrypt(SECRET);
    assert.throws(() => decryptSecret(`v2.${legacy}`));
  });

  it("rejects a truncated authentication tag", () => {
    const [prefix, iv, tag, data] = encryptSecret(SECRET).split(".");
    const short = Buffer.from(tag!, "base64url").subarray(0, 4).toString("base64url");
    assert.throws(() => decryptSecret([prefix, iv, short, data].join(".")));
  });
});

describe("verifyTotpCodeOnce", () => {
  // Same size as real enrollment secrets (otplib requires at least 16 bytes).
  const TOTP_SECRET = generateSecret();

  it("accepts a valid code once and rejects its replay", () => {
    const code = generateSync({ secret: TOTP_SECRET });
    assert.equal(verifyTotpCodeOnce(USER_A, TOTP_SECRET, code), true);
    assert.equal(verifyTotpCodeOnce(USER_A, TOTP_SECRET, code), false);
  });

  it("tracks replay per user", () => {
    const code = generateSync({ secret: TOTP_SECRET });
    assert.equal(verifyTotpCodeOnce(USER_B, TOTP_SECRET, code), true);
  });

  it("rejects wrong codes", () => {
    const code = generateSync({ secret: TOTP_SECRET });
    const wrong = code === "000000" ? "111111" : "000000";
    assert.equal(
      verifyTotpCodeOnce("33333333-3333-4333-8333-333333333333", TOTP_SECRET, wrong),
      false
    );
  });
});
