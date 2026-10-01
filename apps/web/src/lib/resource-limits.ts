/**
 * Pure helpers for per-app CPU/RAM caps. Kept free of imports so they can be
 * unit-tested with node:test and shared by server routes and UI.
 *
 * Dokploy stores limits as strings: memory in bytes, CPU in nanoCPUs
 * (1 vCPU = 1e9). They only reach Docker when Dokploy re-creates the Swarm
 * service (deploy, redeploy, reload), so storing them is not enough.
 */

export const BYTES_PER_MB = 1024 * 1024;
export const NANO_CPUS_PER_CPU = 1_000_000_000;

export interface ResourceSpec {
  /** Memory cap in MB. 0 means no cap. */
  ramMb: number;
  /** CPU cap in vCPUs. 0 means no cap. */
  cpuLimit: number;
}

export interface DokployResourceLimits {
  memoryLimit: string;
  memoryReservation: string;
  cpuLimit: string;
  cpuReservation: string;
}

/**
 * Map a plan's resources to Dokploy fields. Reservations are cleared on
 * purpose: Swarm treats them as hard scheduling constraints, so reserving a
 * share of every app's limit stops new containers from being scheduled once
 * the node is "reserved out", even when it is mostly idle. An empty string
 * passes Dokploy's validation and is treated as unset.
 */
export function toDokployLimits(spec: ResourceSpec): DokployResourceLimits {
  const memory =
    spec.ramMb > 0 ? Math.round(spec.ramMb * BYTES_PER_MB) : 0;
  const cpu =
    spec.cpuLimit > 0 ? Math.round(spec.cpuLimit * NANO_CPUS_PER_CPU) : 0;

  return {
    memoryLimit: memory > 0 ? String(memory) : "",
    memoryReservation: "",
    cpuLimit: cpu > 0 ? String(cpu) : "",
    cpuReservation: "",
  };
}

/** Numeric limits; `null` means no cap is set. */
export interface NumericLimits {
  memoryBytes: number | null;
  nanoCpus: number | null;
}

function positiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function expectedLimits(spec: ResourceSpec): NumericLimits {
  const dokploy = toDokployLimits(spec);
  return {
    memoryBytes: positiveInt(dokploy.memoryLimit),
    nanoCpus: positiveInt(dokploy.cpuLimit),
  };
}

/** Limits stored on the Dokploy application (what the next re-create will use). */
export function parseConfiguredLimits(app: {
  memoryLimit?: string | null;
  cpuLimit?: string | null;
}): NumericLimits {
  return {
    memoryBytes: positiveInt(app.memoryLimit),
    nanoCpus: positiveInt(app.cpuLimit),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Limits the running workload actually has, from `docker inspect` output.
 * Accepts a Swarm task (`Spec.Resources.Limits`) or a container
 * (`HostConfig.Memory` / `HostConfig.NanoCpus`). Returns `null` when the
 * payload has neither shape.
 */
export function parseRuntimeLimits(inspect: unknown): NumericLimits | null {
  const root = Array.isArray(inspect) ? inspect[0] : inspect;
  const obj = record(root);
  if (!obj) return null;

  const spec = record(obj.Spec);
  const resources = record(spec?.Resources);
  if (resources) {
    const limits = record(resources.Limits) ?? {};
    return {
      memoryBytes: positiveInt(limits.MemoryBytes),
      nanoCpus: positiveInt(limits.NanoCPUs),
    };
  }

  const host = record(obj.HostConfig);
  if (host) {
    return {
      memoryBytes: positiveInt(host.Memory),
      nanoCpus: positiveInt(host.NanoCpus),
    };
  }

  return null;
}

export function limitsMatch(a: NumericLimits, b: NumericLimits): boolean {
  return a.memoryBytes === b.memoryBytes && a.nanoCpus === b.nanoCpus;
}

export type LimitStatus =
  | "enforced"
  | "restart_required"
  | "configured"
  | "not_applied"
  | "unknown";

/**
 * - `enforced`: the running workload has the plan limits.
 * - `restart_required`: Dokploy has the right config but the running
 *   container predates it.
 * - `configured`: config is right; the app is not running or could not be
 *   inspected, so limits apply on next start.
 * - `not_applied`: Dokploy config is missing or different from the plan.
 * - `unknown`: Dokploy could not be reached.
 */
export function evaluateLimitStatus(input: {
  expected: NumericLimits;
  configured: NumericLimits | null;
  runtime: NumericLimits | null;
  isRunning: boolean;
}): LimitStatus {
  if (!input.configured) return "unknown";
  if (!limitsMatch(input.expected, input.configured)) return "not_applied";
  if (!input.isRunning || !input.runtime) return "configured";
  return limitsMatch(input.expected, input.runtime)
    ? "enforced"
    : "restart_required";
}

export const LIMIT_STATUS_COPY: Record<
  LimitStatus,
  { label: string; tone: "ok" | "warn" | "danger" | "muted"; hint: string }
> = {
  enforced: {
    label: "Enforced",
    tone: "ok",
    hint: "The running container is capped at the plan limits.",
  },
  restart_required: {
    label: "Restart needed",
    tone: "warn",
    hint: "Limits are saved but the running container started before them. Restart the app to apply.",
  },
  configured: {
    label: "Applied on next start",
    tone: "muted",
    hint: "Limits are saved and apply the next time the container starts.",
  },
  not_applied: {
    label: "Not applied",
    tone: "danger",
    hint: "The deploy platform does not have the plan limits for this app yet.",
  },
  unknown: {
    label: "Unknown",
    tone: "muted",
    hint: "Could not reach the deploy platform to check limits.",
  },
};

export function formatCpu(nanoCpus: number | null): string {
  if (nanoCpus === null) return "No cap";
  const cpus = nanoCpus / NANO_CPUS_PER_CPU;
  const rounded = Number.isInteger(cpus) ? String(cpus) : cpus.toFixed(2).replace(/0+$/, "");
  return `${rounded} vCPU`;
}

export function formatMemory(bytes: number | null): string {
  if (bytes === null) return "No cap";
  const mb = bytes / BYTES_PER_MB;
  if (mb >= 1024 && mb % 1024 === 0) return `${mb / 1024} GB`;
  return `${Math.round(mb)} MB`;
}

export function formatSpec(spec: ResourceSpec): string {
  const expected = expectedLimits(spec);
  return `${formatCpu(expected.nanoCpus)} · ${formatMemory(expected.memoryBytes)} RAM`;
}
