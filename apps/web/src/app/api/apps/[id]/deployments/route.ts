import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import {
  syncLocalDeployments,
  toDeploymentListItem,
} from "@/lib/deployments";

export async function GET(
  _request: Request,
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
          error instanceof Error
            ? error.message
            : "Failed to list deployments",
      },
      { status: 500 }
    );
  }
}
