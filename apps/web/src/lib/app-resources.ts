import type { DokployClient } from "@hostingit/dokploy-client";
import { getPlanConfig } from "@/lib/plans";

export interface PlanResourceLimits {
  memoryLimit: string;
  memoryReservation: string;
  cpuLimit: string;
  cpuReservation: string;
}

/** Dokploy expects memory like "256m" and cpu as decimal core count ("0.25"). */
export function getPlanResourceLimits(plan: string): PlanResourceLimits {
  const { ramMb, cpuLimit } = getPlanConfig(plan);
  const memory = `${ramMb}m`;
  const reservationMb = Math.max(64, Math.floor(ramMb / 2));
  const cpuReservation = Math.max(0.1, cpuLimit / 2);

  return {
    memoryLimit: memory,
    memoryReservation: `${reservationMb}m`,
    cpuLimit: String(cpuLimit),
    cpuReservation: String(cpuReservation),
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
