import { NextResponse } from "next/server";
import { createDokployClient, DokployError } from "@hostingit/dokploy-client";

export async function GET() {
  const hasConfig =
    Boolean(process.env.DOKPLOY_API_URL) && Boolean(process.env.DOKPLOY_API_KEY);

  if (!hasConfig) {
    return NextResponse.json({
      status: "degraded",
      deploy: "not_configured",
      database: Boolean(process.env.DATABASE_URL),
    });
  }

  try {
    const client = createDokployClient();
    await client.healthCheck();
    return NextResponse.json({
      status: "ok",
      deploy: "connected",
      database: Boolean(process.env.DATABASE_URL),
    });
  } catch (error) {
    const message =
      error instanceof DokployError ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "degraded",
        deploy: "error",
        message,
        database: Boolean(process.env.DATABASE_URL),
      },
      { status: 503 }
    );
  }
}
