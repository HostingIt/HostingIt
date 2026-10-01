import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import {
  enforcePlanLimits,
  inspectAppLimits,
  unknownLimitReport,
  type AppLimitReport,
} from "@/lib/app-resources";
import { mapWithConcurrency } from "@/lib/concurrency";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { isUnlimitedHosting } from "@/lib/plans";
import { toClientError } from "@/lib/safe-error";

/** Dokploy calls in flight at once during bulk admin work. */
const BULK_CONCURRENCY = 3;

export interface AdminAppTarget {
  id: string;
  name: string;
  userId: string;
  status: string;
  dokployAppId: string;
  plan: string;
}

export interface EnforceOutcome {
  appId: string;
  name: string;
  outcome: "reloaded" | "saved" | "skipped" | "failed";
  error?: string;
}

/** Apps still provisioning have a placeholder id and no Dokploy app yet. */
function isProvisioned(app: { dokployAppId: string }): boolean {
  return !!app.dokployAppId && !app.dokployAppId.startsWith("pending:");
}

export async function listAdminAppTargets(filter?: {
  appId?: string;
  userId?: string;
}): Promise<AdminAppTarget[]> {
  const query = db
    .select({
      id: apps.id,
      name: apps.name,
      userId: apps.userId,
      status: apps.status,
      dokployAppId: apps.dokployAppId,
      plan: users.plan,
    })
    .from(apps)
    .innerJoin(users, eq(users.id, apps.userId));

  if (filter?.appId) return query.where(eq(apps.id, filter.appId));
  if (filter?.userId) return query.where(eq(apps.userId, filter.userId));
  return query;
}

/**
 * Saves plan limits on each app and restarts running containers (no rebuild)
 * so the caps apply immediately. Stopped apps get them on next start.
 */
export async function enforceLimitsOnApps(
  targets: AdminAppTarget[],
  options: { actorId: string; request?: Request }
): Promise<EnforceOutcome[]> {
  const dokploy = getDokployClient();

  return mapWithConcurrency(targets, BULK_CONCURRENCY, async (app) => {
    if (!isProvisioned(app)) {
      return { appId: app.id, name: app.name, outcome: "skipped" as const };
    }
    try {
      const outcome = await enforcePlanLimits(dokploy, app, app.plan);
      recordAuditEvent({
        userId: app.userId,
        appId: app.id,
        action: AUDIT_ACTIONS.adminAppLimitsEnforce,
        request: options.request,
        metadata: {
          plan: app.plan,
          result: outcome === "reloaded" ? "restarted with new limits" : "saved for next start",
          actorId: options.actorId,
        },
      });
      return { appId: app.id, name: app.name, outcome };
    } catch (error) {
      console.error(`[admin] enforce limits failed for ${app.id}:`, error);
      return {
        appId: app.id,
        name: app.name,
        outcome: "failed" as const,
        error: toClientError(error, "Deploy platform rejected the update"),
      };
    }
  });
}

export function summarizeOutcomes(results: EnforceOutcome[]) {
  return {
    reloaded: results.filter((r) => r.outcome === "reloaded").length,
    saved: results.filter((r) => r.outcome === "saved").length,
    skipped: results.filter((r) => r.outcome === "skipped").length,
    failed: results.filter((r) => r.outcome === "failed").length,
  };
}

export interface AdminLimitRow extends AppLimitReport {
  appId: string;
}

export async function inspectLimitsForApps(
  targets: AdminAppTarget[]
): Promise<AdminLimitRow[]> {
  let dokploy: ReturnType<typeof getDokployClient> | null = null;
  try {
    dokploy = getDokployClient();
  } catch {
    dokploy = null;
  }

  return mapWithConcurrency(targets, BULK_CONCURRENCY, async (app) => {
    if (!dokploy || !isProvisioned(app)) {
      return { appId: app.id, ...unknownLimitReport(app.plan) };
    }
    const report = await inspectAppLimits(dokploy, app, app.plan);
    return { appId: app.id, ...report };
  });
}

/** The ADMIN_EMAIL account can never be suspended or demoted from here. */
export function isProtectedAccount(user: { role: string; email: string }): boolean {
  return isUnlimitedHosting(user);
}
