import { NextResponse } from "next/server";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { assertDeploymentBelongsToApp } from "@/lib/deploy-log-access";
import { sanitizeDeployLogs } from "@/lib/deploy-hints";
import { requireApiUser } from "@/lib/api-auth";
import {
  parseLogSearch,
  parseLogSince,
  parseLogTail,
  parseOptionalLogTail,
} from "@/lib/log-query";

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
  const tailParam = searchParams.get("tail");
  const since = parseLogSince(searchParams.get("since"));
  const search = parseLogSearch(searchParams.get("search"));

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
        parseOptionalLogTail(tailParam)
      );
    } else {
      logs = await dokploy.getApplicationLogs(app.dokployAppId, {
        tail: parseLogTail(tailParam),
        since,
        search,
      });
    }
  } catch {
    logs = "Unable to fetch logs. Try again later or contact support.";
  }

  return NextResponse.json({ logs: sanitizeDeployLogs(logs) });
}
