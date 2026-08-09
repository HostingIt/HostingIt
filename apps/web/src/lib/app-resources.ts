import type { DokployClient } from "@hostingit/dokploy-client";
import { getPlanConfig } from "@/lib/plans";

export interface PlanResourceLimits {
  memoryLimit: string;
  memoryReservation: string;
  cpuLimit: string;
  cpuReservation: string;
}

/** Dokploy expects raw memory bytes and CPU nanoCPUs as strings. */
export function getPlanResourceLimits(plan: string): PlanResourceLimits {
  const { ramMb, cpuLimit } = getPlanConfig(plan);
  const memory = ramMb * 1024 * 1024;
  const reservationMb = Math.max(64, Math.floor(ramMb / 2));
  const cpuReservation = Math.max(0.1, cpuLimit / 2);

  return {
    memoryLimit: String(memory),
    memoryReservation: String(reservationMb * 1024 * 1024),
    cpuLimit: String(Math.round(cpuLimit * 1_000_000_000)),
    cpuReservation: String(Math.round(cpuReservation * 1_000_000_000)),
  };
}

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
