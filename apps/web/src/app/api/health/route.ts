import { NextResponse } from "next/server";
import { createDokployClient } from "@hostingit/dokploy-client";

/**
 * Public liveness probe used by the Docker HEALTHCHECK.
 *
 * IMPORTANT: always returns HTTP 200 so the Docker healthcheck (wget-based)
 * never fails just because an upstream service (Dokploy, DB) is unreachable.
 * Upstream status is surfaced in the JSON body only — it is informational.
 * A non-2xx here kills the container healthcheck → Traefik drops the container
 * → Swarm endlessly respawns it → permanent 502.
 */
export async function GET() {
  const hasConfig =
    Boolean(process.env.DOKPLOY_API_URL) && Boolean(process.env.DOKPLOY_API_KEY);
  const hasDb = Boolean(process.env.DATABASE_URL);

  if (!hasConfig) {
    return NextResponse.json({
      status: "degraded",
      deploy: "not_configured",
      database: hasDb,
    });
  }

  try {
    const client = createDokployClient();
    await client.healthCheck();
    return NextResponse.json({
      status: "ok",
      deploy: "connected",
      database: hasDb,
    });
  } catch {
    // Dokploy unreachable — app can still serve traffic, so stay 200.
    return NextResponse.json({
      status: "degraded",
      deploy: "error",
      database: hasDb,
    });
  }
}
