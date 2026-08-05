import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { apps, users } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allApps = await db
    .select({
      app: apps,
      userEmail: users.email,
    })
    .from(apps)
    .innerJoin(users, eq(apps.userId, users.id));

  return NextResponse.json({ apps: allApps });
}
