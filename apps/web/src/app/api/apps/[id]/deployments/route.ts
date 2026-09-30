import { NextResponse } from "next/server";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { toClientError } from "@/lib/safe-error";
import {
  syncLocalDeployments,
  toDeploymentListItem,
} from "@/lib/deployments";
import { requireApiUser } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const app = await getOwnedApp(authResult.user.id, id);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    const dokploy = getDokployClient();
    const remote = await dokploy.listDeployments(app.dokployAppId);
    const items = remote.filter((d) => d.deploymentId).map(toDeploymentListItem);

    // Sync local deployments table (best-effort)
    try {
      await syncLocalDeployments(app.id, remote);
    } catch (error) {
      console.error("Sync deployments error:", error);
    }

    return NextResponse.json({ deployments: items });
  } catch (error) {
    console.error("List deployments error:", error);
    return NextResponse.json(
      {
        error:
          toClientError(error, "Failed to list deployments"),
      },
      { status: 500 }
    );
  }
}
