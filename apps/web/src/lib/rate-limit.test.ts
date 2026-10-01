import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimits, clientIpFromHeaders } from "./rate-limit.ts";

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe("clientIpFromHeaders", () => {
  afterEach(() => {
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  it("ignores client-supplied entries left of the trusted proxy", () => {
    const h = headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" });
    assert.equal(clientIpFromHeaders(h), "203.0.113.7");
  });

  it("honours TRUSTED_PROXY_HOPS for a CDN in front of the proxy", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    const h = headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.7, 198.51.100.1" });
    assert.equal(clientIpFromHeaders(h), "203.0.113.7");
  });

  it("uses the only entry when there are fewer entries than hops", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    assert.equal(
      clientIpFromHeaders(headers({ "x-forwarded-for": "203.0.113.7" })),
      "203.0.113.7"
    );
  });

  it("falls back to x-real-ip, then unknown", () => {
    assert.equal(clientIpFromHeaders(headers({ "x-real-ip": "203.0.113.9" })), "203.0.113.9");
    assert.equal(clientIpFromHeaders(headers({})), "unknown");
  });
});

describe("checkRateLimits", () => {
  it("enforces the per-account limit across different addresses", () => {
    const account = `acct-${Math.random()}`;
    const rules = (ip: string) => [
      { key: account, limit: 3, windowMs: 60_000 },
      { key: `${account}:${ip}`, limit: 2, windowMs: 60_000 },
    ];
    assert.ok(checkRateLimits(rules("a")).ok);
    assert.ok(checkRateLimits(rules("b")).ok);
    assert.ok(checkRateLimits(rules("c")).ok);
    assert.equal(checkRateLimits(rules("d")).ok, false);
  });
});
