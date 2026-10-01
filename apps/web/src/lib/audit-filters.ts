/** Activity-log categories shared by the Security page, its API, and admin. */
export const AUDIT_FILTERS = [
  { key: "all", label: "All" },
  { key: "auth", label: "Sign-in & security" },
  { key: "apps", label: "Apps" },
  { key: "billing", label: "Billing" },
  { key: "account", label: "Account" },
] as const;

export type AuditFilterKey = (typeof AUDIT_FILTERS)[number]["key"];

/** Each category matches actions by prefix. */
export const AUDIT_FILTER_PREFIXES: Record<AuditFilterKey, string[]> = {
  all: [],
  auth: ["auth.", "security.", "github."],
  apps: ["app.", "admin.app_", "admin.limits_"],
  billing: ["billing.", "admin.payment_"],
  account: ["account.", "admin.user_"],
};

export function isAuditFilterKey(value: unknown): value is AuditFilterKey {
  return AUDIT_FILTERS.some((f) => f.key === value);
}
