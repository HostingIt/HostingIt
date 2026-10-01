import type { Application, DokployClient } from "@hostingit/dokploy-client";
import { getPlanConfig } from "@/lib/plans";
import {
  evaluateLimitStatus,
  expectedLimits,
  parseConfiguredLimits,
  parseRuntimeLimits,
  toDokployLimits,
  type DokployResourceLimits,
  type LimitStatus,
  type NumericLimits,
} from "@/lib/resource-limits";

export type PlanResourceLimits = DokployResourceLimits;

/** Dokploy expects raw memory bytes and CPU nanoCPUs as strings. */
export function getPlanResourceLimits(plan: string): PlanResourceLimits {
  return toDokployLimits(getPlanConfig(plan));
}

/**
 * Stores the plan limits on the Dokploy application. They take effect the
 * next time Dokploy re-creates the service (deploy, redeploy, reload); use
 * `enforcePlanLimits` to apply them to a running container right away.
 */
export async function applyPlanResourceLimits(
  dokploy: DokployClient,
  applicationId: string,
  plan: string
) {
  const limits = getPlanResourceLimits(plan);
  await dokploy.updateApplication({
    applicationId,
    ...limits,
  });
}

function remoteAppName(remote: Application): string {
  return remote.appName ?? remote.name;
}

/**
 * Saves plan limits and re-creates the Swarm service (no rebuild) so they
 * apply to the running container. Reload re-creates the service with its
 * stored replica count, so it is only used for running apps; a stopped app
 * keeps the saved limits and gets them when it starts.
 */
export async function enforcePlanLimits(
  dokploy: DokployClient,
  app: { dokployAppId: string; status: string },
  plan: string
): Promise<"reloaded" | "saved"> {
  await applyPlanResourceLimits(dokploy, app.dokployAppId, plan);
  if (app.status !== "running") return "saved";

  const remote = await dokploy.getApplication(app.dokployAppId);
  await dokploy.reload({
    applicationId: app.dokployAppId,
    appName: remoteAppName(remote),
  });
  return "reloaded";
}

/** Saves plan limits, then starts the app by re-creating its service. */
export async function startWithPlanLimits(
  dokploy: DokployClient,
  dokployAppId: string,
  plan: string
): Promise<void> {
  await applyPlanResourceLimits(dokploy, dokployAppId, plan);
  const remote = await dokploy.getApplication(dokployAppId);
  try {
    await dokploy.reload({
      applicationId: dokployAppId,
      appName: remoteAppName(remote),
    });
  } catch (error) {
    console.error("Reload on start failed, falling back to scale-up:", error);
    await dokploy.startApplication(dokployAppId);
  }
}

/** Saves plan limits, then restarts the running container with them. */
export async function restartWithPlanLimits(
  dokploy: DokployClient,
  dokployAppId: string,
  plan: string
): Promise<void> {
  await applyPlanResourceLimits(dokploy, dokployAppId, plan);
  const remote = await dokploy.getApplication(dokployAppId);
  await dokploy.reload({
    applicationId: dokployAppId,
    appName: remoteAppName(remote),
  });
}

export interface AppLimitReport {
  status: LimitStatus;
  expected: NumericLimits;
  configured: NumericLimits | null;
  runtime: NumericLimits | null;
}

/** Report used when the deploy platform cannot be reached at all. */
export function unknownLimitReport(plan: string): AppLimitReport {
  return {
    status: "unknown",
    expected: expectedLimits(getPlanConfig(plan)),
    configured: null,
    runtime: null,
  };
}

async function readRuntimeLimits(
  dokploy: DokployClient,
  appName: string
): Promise<NumericLimits | null> {
  try {
    const tasks = await dokploy.getServiceTasks(appName);
    const task =
      tasks.find((t) => t.state?.toLowerCase() === "running") ?? null;
    if (!task?.containerId) return null;
    return parseRuntimeLimits(await dokploy.inspect(task.containerId));
  } catch {
    return null;
  }
}

/**
 * Compares the plan limits with what Dokploy has stored and, for running
 * apps, with what the live Swarm task actually has. Never throws.
 */
export async function inspectAppLimits(
  dokploy: DokployClient,
  app: { dokployAppId: string; status: string; remote?: Application | null },
  plan: string
): Promise<AppLimitReport> {
  const expected = expectedLimits(getPlanConfig(plan));

  let remote = app.remote ?? null;
  if (!remote) {
    try {
      remote = await dokploy.getApplication(app.dokployAppId);
    } catch {
      remote = null;
    }
  }

  if (!remote) return unknownLimitReport(plan);

  const configured = parseConfiguredLimits(remote);
  const isRunning = app.status === "running";
  const runtime = isRunning
    ? await readRuntimeLimits(dokploy, remoteAppName(remote))
    : null;

  return {
    status: evaluateLimitStatus({ expected, configured, runtime, isRunning }),
    expected,
    configured,
    runtime,
  };
}
