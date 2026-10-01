import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeUserAgent } from "./user-agent.ts";

describe("describeUserAgent", () => {
  it("handles Chrome on macOS", () => {
    const info = describeUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    );
    assert.equal(info.label, "Chrome on macOS");
    assert.equal(info.device, "desktop");
  });

  it("handles Safari on iOS", () => {
    const info = describeUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    );
    assert.equal(info.label, "Safari on iOS");
    assert.equal(info.device, "mobile");
  });

  it("handles Firefox on Windows", () => {
    const info = describeUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0"
    );
    assert.equal(info.label, "Firefox on Windows");
  });

  it("prefers Edge over Chrome", () => {
    const info = describeUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0"
    );
    assert.equal(info.browser, "Edge");
  });

  it("detects Android tablets and phones", () => {
    assert.equal(
      describeUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36"
      ).device,
      "mobile"
    );
    assert.equal(
      describeUserAgent(
        "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
      ).device,
      "tablet"
    );
  });

  it("labels CLI clients and webhooks", () => {
    assert.deepEqual(describeUserAgent("curl/8.7.1"), {
      browser: "curl",
      os: null,
      device: "bot",
      label: "curl",
    });
    assert.equal(describeUserAgent("GitHub-Hookshot/abc123").label, "GitHub webhook");
  });

  it("handles empty input", () => {
    assert.equal(describeUserAgent("").label, "Unknown device");
    assert.equal(describeUserAgent(null).device, "unknown");
    assert.equal(describeUserAgent("something-odd").label, "Unknown device");
  });
});
