import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  PENDING_TOTP_MAX_AGE_SEC,
  decryptPendingSecret,
  encryptPendingSecret,
  encryptSecret,
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
