import { after } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getClientIp } from "@/lib/rate-limit";

/** Canonical audit actions. Grouped by `category` prefix for the Security page filters. */
export const AUDIT_ACTIONS = {
  authLogin: "auth.login",
  authLogout: "auth.logout",
  authTwoFactorEnabled: "auth.2fa.enabled",
  authTwoFactorVerifyFailed: "auth.2fa.verify_failed",
  securityProviderLinked: "security.provider_linked",
  securityProviderUnlinked: "security.provider_unlinked",
  appCreate: "app.create",
  appDelete: "app.delete",
  appStart: "app.start",
  appStop: "app.stop",
  appRestart: "app.restart",
  appCancel: "app.cancel",
  appRedeploy: "app.redeploy",
  appEnvUpdate: "app.env_update",
  appSettingsUpdate: "app.settings_update",
  appDomainUpdate: "app.domain_update",
  billingRequest: "billing.request",
  accountDelete: "account.delete",
  githubInstall: "github.install",
  githubUninstall: "github.uninstall",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

type AuditEventInput = {
  userId: string;
  appId?: string | null;
  action: AuditAction;
  /** Context such as key names, provider, or ids. Never include secret values. */
  metadata?: Record<string, unknown>;
  request?: Request;
  /** Alternative to `request` when only headers are reachable (e.g. auth callbacks). */
  headers?: Headers;
};

function extractRequestInfo(input: AuditEventInput): {
  ip: string | null;
  userAgent: string | null;
} {
  const source = input.request ? input.request.headers : input.headers;
  if (!source) return { ip: null, userAgent: null };

  const userAgent = source.get("user-agent")?.trim() || null;
  if (input.request) {
    const ip = getClientIp(input.request);
    return { ip: ip === "unknown" ? null : ip, userAgent };
  }

  const forwarded = source.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  const ip =
    firstForwarded || source.get("x-real-ip")?.trim() || null;
  return { ip: ip || null, userAgent };
}

function insertAuditRow(
  input: AuditEventInput,
  ip: string | null,
  userAgent: string | null
) {
  return db
    .insert(auditLogs)
    .values({
      userId: input.userId,
      appId: input.appId ?? null,
      action: input.action,
      metadata: input.metadata ?? {},
      ip,
      userAgent,
    })
    .catch((error) => {
      console.error(`[audit] failed to record "${input.action}":`, error);
    });
}

/**
 * Records a security audit event without ever blocking or failing the host
 * flow. Uses `after()` when a request scope exists (route handlers / server
 * actions) and falls back to a floating promise otherwise.
 */
export function recordAuditEvent(input: AuditEventInput): void {
  const { ip, userAgent } = extractRequestInfo(input);

  try {
    after(() => insertAuditRow(input, ip, userAgent));
  } catch {
    void insertAuditRow(input, ip, userAgent);
  }
}
