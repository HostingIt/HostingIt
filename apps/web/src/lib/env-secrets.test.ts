import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MASKED_ENV_VALUE,
  isSensitiveEnvKey,
  mergeEnvVarUpdates,
  toMaskedEnvResponse,
} from "./env-secrets.ts";

describe("env-secrets", () => {
  it("detects sensitive key names", () => {
    assert.equal(isSensitiveEnvKey("DATABASE_PASSWORD"), true);
    assert.equal(isSensitiveEnvKey("STRIPE_API_KEY"), true);
    assert.equal(isSensitiveEnvKey("NODE_ENV"), false);
  });

  it("masks sensitive env values on read", () => {
    const rows = toMaskedEnvResponse([
      { key: "API_TOKEN", value: "abc123" },
      { key: "PORT", value: "3000" },
    ]);
    assert.equal(rows[0]?.value, MASKED_ENV_VALUE);
    assert.equal(rows[0]?.secret, true);
    assert.equal(rows[0]?.masked, true);
    assert.equal(rows[1]?.value, "3000");
    assert.equal(rows[1]?.secret, false);
  });

  it("always masks build secrets", () => {
    const rows = toMaskedEnvResponse(
      [{ key: "NPM_TOKEN", value: "secret" }],
      { forceSecret: true }
    );
    assert.equal(rows[0]?.value, MASKED_ENV_VALUE);
    assert.equal(rows[0]?.secret, true);
  });

  it("preserves existing values when client sends masked placeholders", () => {
    const merged = mergeEnvVarUpdates(
      [{ key: "API_TOKEN", value: MASKED_ENV_VALUE, secret: true }],
      [{ key: "API_TOKEN", value: "real-secret" }]
    );
    assert.deepEqual(merged, [{ key: "API_TOKEN", value: "real-secret" }]);
  });
});
