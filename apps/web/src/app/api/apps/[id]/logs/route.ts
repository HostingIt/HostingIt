import { NextResponse } from "next/server";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { assertDeploymentBelongsToApp } from "@/lib/deploy-log-access";
import { sanitizeDeployLogs } from "@/lib/deploy-hints";
import type { LogSince } from "@hostingit/dokploy-client";
import { requireApiUser } from "@/lib/api-auth";

const LOG_SINCE_PATTERN = /^(\d+)([smhd])$/;

function parseLogSince(value: string | null): LogSince | undefined {
  if (!value || value === "all") return undefined;
  return LOG_SINCE_PATTERN.test(value) ? (value as LogSince) : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const app = await getOwnedApp(authResult.user.id, id);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "runtime";
  const deploymentId = searchParams.get("deploymentId");
  const tail = searchParams.get("tail");
  const since = parseLogSince(searchParams.get("since"));
  const search = searchParams.get("search") ?? undefined;

  const dokploy = getDokployClient();

  let logs = "";
  try {
    if (type === "build" && deploymentId) {
      const allowed = await assertDeploymentBelongsToApp(
        dokploy,
        app.id,
        app.dokployAppId,
        deploymentId
      );
      if (!allowed) {
        return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
      }
      logs = await dokploy.getDeploymentLogs(
        deploymentId,
        tail ? Number(tail) : undefined
      );
    } else {
      logs = await dokploy.getApplicationLogs(app.dokployAppId, {
        tail: tail ? Number(tail) : 200,
        since,
        search,
      });
    }
  } catch {
    logs = "Unable to fetch logs. Try again later or contact support.";
  }

  return NextResponse.json({ logs: sanitizeDeployLogs(logs) });
}
