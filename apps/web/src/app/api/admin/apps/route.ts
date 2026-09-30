import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { requireApiAdmin } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireApiAdmin();
  if ("error" in authResult) return authResult.error;

  const allApps = await db
    .select({
      app: apps,
      userEmail: users.email,
    })
    .from(apps)
    .innerJoin(users, eq(apps.userId, users.id));

  return NextResponse.json({ apps: allApps });
}
