import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/api-auth";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import {
  enforceLimitsOnApps,
  listAdminAppTargets,
  summarizeOutcomes,
} from "@/lib/admin";
import { toClientError } from "@/lib/safe-error";

const bodySchema = z.object({
  /** Omit to enforce on every app. */
  appId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;
  const admin = authResult.user;

  let body: unknown = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const targets = await listAdminAppTargets(
    parsed.data.appId ? { appId: parsed.data.appId } : undefined
  );
  if (parsed.data.appId && targets.length === 0) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    const results = await enforceLimitsOnApps(targets, {
      actorId: admin.id,
      request,
    });
    const summary = summarizeOutcomes(results);

    if (!parsed.data.appId) {
      recordAuditEvent({
        userId: admin.id,
        action: AUDIT_ACTIONS.adminLimitsEnforceAll,
        request,
        metadata: { apps: results.length, ...summary },
      });
    }

    return NextResponse.json({ summary, results });
  } catch (error) {
    console.error("[admin] enforce limits error:", error);
    return NextResponse.json(
      { error: toClientError(error, "Could not reach the deploy platform") },
      { status: 502 }
    );
  }
}
