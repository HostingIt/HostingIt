import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkInstallationOwnership,
  type GithubInstallation,
} from "./github-app.ts";

function installation(
  account: GithubInstallation["account"]
): GithubInstallation {
  return { id: 42, account };
}

describe("checkInstallationOwnership", () => {
  it("accepts a personal installation on the linked GitHub account", () => {
    const result = checkInstallationOwnership(
      installation({ id: 1001, login: "alice", type: "User" }),
      "1001"
    );
    assert.deepEqual(result, { ok: true });
  });

  it("rejects an installation on someone else's account", () => {
    const result = checkInstallationOwnership(
      installation({ id: 2002, login: "victim", type: "User" }),
      "1001"
    );
    assert.deepEqual(result, { ok: false, reason: "not_owner" });
  });

  it("rejects organization installations", () => {
    const result = checkInstallationOwnership(
      installation({ id: 1001, login: "acme", type: "Organization" }),
      "1001"
    );
    assert.deepEqual(result, { ok: false, reason: "organization" });
  });

  it("rejects missing installations", () => {
    assert.deepEqual(checkInstallationOwnership(null, "1001"), {
      ok: false,
      reason: "not_found",
    });
    assert.deepEqual(checkInstallationOwnership(installation(null), "1001"), {
      ok: false,
      reason: "not_found",
    });
  });
});
