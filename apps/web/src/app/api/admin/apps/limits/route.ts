import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { inspectLimitsForApps, listAdminAppTargets } from "@/lib/admin";

/** Live CPU/RAM limit status for every app (plan vs Dokploy vs running task). */
export async function GET() {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

  const targets = await listAdminAppTargets();
  const limits = await inspectLimitsForApps(targets);
  return NextResponse.json({ limits });
}
