import type { LogSince } from "@hostingit/dokploy-client";

export const DEFAULT_LOG_TAIL = 200;
export const MAX_LOG_TAIL = 2000;
export const MAX_LOG_SEARCH_LENGTH = 200;

const LOG_SINCE_PATTERN = /^(\d{1,4})([smhd])$/;

/** Positive integer line count capped at MAX_LOG_TAIL, or undefined. */
export function parseOptionalLogTail(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return undefined;
  return Math.min(n, MAX_LOG_TAIL);
}

/** Line count for runtime logs, defaulting to DEFAULT_LOG_TAIL. */
export function parseLogTail(value: string | null): number {
  return parseOptionalLogTail(value) ?? DEFAULT_LOG_TAIL;
}

export function parseLogSince(value: string | null): LogSince | undefined {
  if (!value || value === "all") return undefined;
  return LOG_SINCE_PATTERN.test(value) ? (value as LogSince) : undefined;
}

export function parseLogSearch(value: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_LOG_SEARCH_LENGTH);
}
