import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APP_SLUG_RE,
  InvalidAppSlugError,
  UNIQUE_APP_SUFFIX_LENGTH,
  appendUniqueSlugSuffix,
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

  it("adds a deterministic unique suffix without exceeding DNS limits", () => {
    const slug = appendUniqueSlugSuffix(
      "a".repeat(48),
      "ABC-def123456789"
    );

    assert.equal(slug, `a`.repeat(35) + "-abcdef123456");
    assert.equal(slug.length, 48);
    assert.equal(isValidAppSlug(slug), true);
  });

  it("produces different host slugs for different suffixes", () => {
    const first = appendUniqueSlugSuffix("prism-break", "111111111111");
    const second = appendUniqueSlugSuffix("prism-break", "222222222222");

    assert.notEqual(first, second);
    assert.match(first, APP_SLUG_RE);
    assert.match(second, APP_SLUG_RE);
    assert.equal(UNIQUE_APP_SUFFIX_LENGTH, 12);
  });

  it("requires at least one ASCII letter or digit in the name", () => {
    assert.equal(isValidAppNameForSlug("---"), false);
    assert.equal(isValidAppNameForSlug("а"), false);
    assert.equal(isValidAppNameForSlug("café"), true);
    assert.equal(slugifyAppName("café"), "caf");
  });
});
