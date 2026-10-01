import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isCrossOriginWrite } from "./request-origin.ts";

const env = { NEXT_PUBLIC_APP_URL: "https://hostingit.online", AUTH_URL: "https://hostingit.online" };

function h(values: Record<string, string>): Headers {
  return new Headers({ host: "hostingit.online", ...values });
}

describe("isCrossOriginWrite", () => {
  it("never blocks safe methods", () => {
    assert.equal(isCrossOriginWrite("GET", h({ "sec-fetch-site": "cross-site" }), env), false);
  });

  it("allows same-origin writes", () => {
    const headers = h({ "sec-fetch-site": "same-origin", origin: "https://hostingit.online" });
    assert.equal(isCrossOriginWrite("POST", headers, env), false);
  });

  it("blocks same-site writes from tenant subdomains", () => {
    const headers = h({
      "sec-fetch-site": "same-site",
      origin: "https://fhusr-app-a1b2c3d4e5f6.hostingit.online",
    });
    assert.equal(isCrossOriginWrite("POST", headers, env), true);
  });

  it("blocks cross-site writes", () => {
    assert.equal(isCrossOriginWrite("DELETE", h({ "sec-fetch-site": "cross-site" }), env), true);
  });

  it("checks Origin when Sec-Fetch-Site is absent", () => {
    assert.equal(
      isCrossOriginWrite("POST", h({ origin: "https://evil.example" }), env),
      true
    );
    assert.equal(
      isCrossOriginWrite("POST", h({ origin: "https://hostingit.online" }), env),
      false
    );
    assert.equal(isCrossOriginWrite("POST", h({ origin: "null" }), env), true);
  });

  it("allows requests that carry no browser headers", () => {
    assert.equal(isCrossOriginWrite("POST", h({}), env), false);
  });
});
