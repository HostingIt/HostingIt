import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APP_SLUG_RE,
  InvalidAppSlugError,
  isValidAppNameForSlug,
  isValidAppSlug,
  slugify,
  slugifyAppName,
} from "./utils.ts";

describe("app slug", () => {
  it("slugify normalizes display names", () => {
    assert.equal(slugify("My API"), "my-api");
    assert.equal(slugify("  spaces  "), "spaces");
    assert.equal(slugify("API"), "api");
  });

  it("rejects punctuation-only names", () => {
    assert.equal(isValidAppNameForSlug("---"), false);
    assert.equal(isValidAppNameForSlug("!!!"), false);
    assert.equal(isValidAppNameForSlug("%_%"), false);
    assert.throws(() => slugifyAppName("---"), InvalidAppSlugError);
  });

  it("rejects empty slugs and leading/trailing hyphens", () => {
    assert.equal(isValidAppSlug(""), false);
    assert.equal(isValidAppSlug("-api"), false);
    assert.equal(isValidAppSlug("api-"), false);
    assert.equal(isValidAppSlug("fhusr-"), false);
  });

  it("accepts DNS-safe slugs", () => {
    assert.equal(isValidAppSlug("api"), true);
    assert.equal(isValidAppSlug("my-api"), true);
    assert.equal(isValidAppSlug("my-api-1"), true);
    assert.match("my-api-1", APP_SLUG_RE);
  });

  it("requires at least one ASCII letter or digit in the name", () => {
    assert.equal(isValidAppNameForSlug("---"), false);
    assert.equal(isValidAppNameForSlug("а"), false);
    assert.equal(isValidAppNameForSlug("café"), true);
    assert.equal(slugifyAppName("café"), "caf");
  });
});
