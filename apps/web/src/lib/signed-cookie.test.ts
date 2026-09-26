import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONSENT_TOKEN_MAX_AGE_MS,
  createConsentToken,
  verifyConsentToken,
  type ConsentPayload,
} from "./signed-cookie.ts";

process.env.AUTH_SECRET = "test-secret-for-consent-tokens";

function payload(overrides: Partial<ConsentPayload> = {}): ConsentPayload {
  return {
    acceptedAt: new Date().toISOString(),
    termsVersion: "2026-09-26",
    privacyVersion: "2026-09-26",
    ...overrides,
  };
}

describe("consent token", () => {
  it("round-trips a signed payload", async () => {
    const token = await createConsentToken(payload());
    const verified = await verifyConsentToken(token);
    assert.ok(verified);
    assert.equal(verified.termsVersion, "2026-09-26");
    assert.equal(verified.privacyVersion, "2026-09-26");
  });

  it("rejects missing and malformed tokens", async () => {
    assert.equal(await verifyConsentToken(undefined), null);
    assert.equal(await verifyConsentToken(""), null);
    assert.equal(await verifyConsentToken("not-a-token"), null);
    assert.equal(await verifyConsentToken(".signatureonly"), null);
    assert.equal(await verifyConsentToken("bodyonly."), null);
  });

  it("rejects a tampered signature", async () => {
    const token = await createConsentToken(payload());
    const [body, signature] = token.split(".");
    const flipped = signature!.slice(0, -1) + (signature!.endsWith("A") ? "B" : "A");
    assert.equal(await verifyConsentToken(`${body}.${flipped}`), null);
  });

  it("rejects a rewritten body", async () => {
    const token = await createConsentToken(payload());
    const signature = token.split(".")[1]!;
    const rewritten = Buffer.from(
      JSON.stringify(payload({ termsVersion: "1999-01-01" }))
    )
      .toString("base64url");
    assert.equal(await verifyConsentToken(`${rewritten}.${signature}`), null);
  });

  it("rejects stale and future-dated acceptances", async () => {
    const stale = await createConsentToken(
      payload({
        acceptedAt: new Date(
          Date.now() - CONSENT_TOKEN_MAX_AGE_MS - 60_000
        ).toISOString(),
      })
    );
    assert.equal(await verifyConsentToken(stale), null);

    const future = await createConsentToken(
      payload({ acceptedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
    );
    assert.equal(await verifyConsentToken(future), null);
  });

  it("rejects signed payloads with the wrong shape", async () => {
    const token = await createConsentToken({
      acceptedAt: new Date().toISOString(),
      termsVersion: "2026-09-26",
    } as ConsentPayload);
    assert.equal(await verifyConsentToken(token), null);
  });
});
