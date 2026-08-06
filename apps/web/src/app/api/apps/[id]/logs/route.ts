import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { sanitizeDeployLogs } from "@/lib/deploy-hints";
import type { LogSince } from "@hostingit/dokploy-client";

const LOG_SINCE_PATTERN = /^(\d+)([smhd])$/;

function parseLogSince(value: string | null): LogSince | undefined {
  if (!value || value === "all") return undefined;
  return LOG_SINCE_PATTERN.test(value) ? (value as LogSince) : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const app = await getOwnedApp(session.user.id, id);
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
