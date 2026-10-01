import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOG_TAIL,
  MAX_LOG_SEARCH_LENGTH,
  MAX_LOG_TAIL,
  parseLogSearch,
  parseLogSince,
  parseLogTail,
  parseOptionalLogTail,
} from "./log-query.ts";

describe("log query parsing", () => {
  it("clamps tail to a sane positive integer", () => {
    assert.equal(parseLogTail(null), DEFAULT_LOG_TAIL);
    assert.equal(parseLogTail("50"), 50);
    assert.equal(parseLogTail("999999999"), MAX_LOG_TAIL);
    assert.equal(parseLogTail("-5"), DEFAULT_LOG_TAIL);
    assert.equal(parseLogTail("1.5"), DEFAULT_LOG_TAIL);
    assert.equal(parseLogTail("abc"), DEFAULT_LOG_TAIL);
    assert.equal(parseOptionalLogTail(null), undefined);
    assert.equal(parseOptionalLogTail("abc"), undefined);
    assert.equal(parseOptionalLogTail("999999999"), MAX_LOG_TAIL);
  });

  it("caps search length", () => {
    assert.equal(parseLogSearch("  "), undefined);
    assert.equal(parseLogSearch("x".repeat(500))?.length, MAX_LOG_SEARCH_LENGTH);
  });

  it("accepts only short duration strings for since", () => {
    assert.equal(parseLogSince("15m"), "15m");
    assert.equal(parseLogSince("all"), undefined);
    assert.equal(parseLogSince("99999999d"), undefined);
  });
});
