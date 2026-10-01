import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import {
  domainVerificationRecord,
  isDomainVerified,
  isReservedDomain,
  reservedDomainRoots,
} from "./custom-domain.ts";

process.env.AUTH_SECRET = "test-secret-for-custom-domains";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("reserved custom domains", () => {
  const roots = reservedDomainRoots({
    NEXT_PUBLIC_BASE_DOMAIN: "hostingit.online",
    NEXT_PUBLIC_APP_URL: "https://hostingit.online",
    AUTH_URL: "https://panel.example.net",
    DOKPLOY_API_URL: "https://dokploy.example.net:3000",
  });

  it("blocks the panel apex and every platform subdomain", () => {
    assert.ok(isReservedDomain("hostingit.online", roots));
    assert.ok(isReservedDomain("www.hostingit.online", roots));
    assert.ok(isReservedDomain("fhusr-my-api-a1b2c3d4e5f6.hostingit.online", roots));
    assert.ok(isReservedDomain("HOSTINGIT.ONLINE", roots));
  });

  it("blocks panel and Dokploy hosts outside the base domain", () => {
    assert.ok(isReservedDomain("panel.example.net", roots));
    assert.ok(isReservedDomain("dokploy.example.net", roots));
  });

  it("allows unrelated domains, including lookalikes", () => {
    assert.ok(!isReservedDomain("app.example.com", roots));
    assert.ok(!isReservedDomain("myhostingit.online", roots));
    assert.ok(!isReservedDomain("example.net", roots));
  });
});

describe("custom domain DNS verification", () => {
  it("builds a stable per-user record", () => {
    const a = domainVerificationRecord(USER, "App.Example.com");
    assert.equal(a.name, "_hostingit-verify.app.example.com");
    assert.deepEqual(a, domainVerificationRecord(USER, "app.example.com"));
    assert.notEqual(a.value, domainVerificationRecord(OTHER, "app.example.com").value);
  });

  it("accepts the expected TXT value, including chunked records", async () => {
    const { value } = domainVerificationRecord(USER, "app.example.com");
    const resolver = async () => [["other"], [value.slice(0, 10), value.slice(10)]];
    assert.equal(await isDomainVerified(USER, "app.example.com", resolver), true);
  });

  it("rejects another user's token and missing records", async () => {
    const { value } = domainVerificationRecord(OTHER, "app.example.com");
    assert.equal(
      await isDomainVerified(USER, "app.example.com", async () => [[value]]),
      false
    );
    const missing = async () => {
      throw Object.assign(new Error("queryTxt ENOTFOUND"), { code: "ENOTFOUND" });
    };
    assert.equal(await isDomainVerified(USER, "app.example.com", missing), false);
  });
});

describe("legacy domain verification tokens", () => {
  it("still accepts a TXT record published before per-purpose keys", async () => {
    const legacy = createHmac("sha256", process.env.AUTH_SECRET!)
      .update(`custom-domain:${USER}:app.example.com`)
      .digest("hex")
      .slice(0, 32);
    const { value } = domainVerificationRecord(USER, "app.example.com");
    assert.notEqual(value, `hostingit-verify=${legacy}`);
    const resolver = async () => [[`hostingit-verify=${legacy}`]];
    assert.equal(await isDomainVerified(USER, "app.example.com", resolver), true);
  });
});
