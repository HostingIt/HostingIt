import { NextResponse } from "next/server";
import { createDokployClient } from "@hostingit/dokploy-client";

/** Public liveness — no upstream error details. */
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
    return NextResponse.json(
      {
        status: "degraded",
        deploy: "error",
        database: hasDb,
      },
      { status: 503 }
    );
  }
}
