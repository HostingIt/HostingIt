import { sanitizeDeployLogs } from "@/lib/deploy-hints";

/** Client-safe error message — never leak tokens, URLs with credentials, or stacks. */
export function toClientError(
  error: unknown,
  fallback = "Something went wrong. Try again or contact support."
): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  const sanitized = sanitizeDeployLogs(error.message);
  const lower = sanitized.toLowerCase();
  if (
    lower.includes("x-access-token") ||
    lower.includes("ghs_") ||
    lower.includes("ghp_") ||
    lower.includes("authorization") ||
    lower.includes("api key") ||
    lower.includes("dokploy") ||
    sanitized.length > 280
  ) {
    return fallback;
  }
  // Allow short, already-sanitized operational messages
  if (
    lower.includes("not found") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("invalid") ||
    lower.includes("limit") ||
    lower.includes("suspended")
  ) {
    return sanitized.slice(0, 200);
  }
  return fallback;
}
