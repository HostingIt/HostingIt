import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireApiUser } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const [user] = await db
    .select({
      email: users.email,
      name: users.name,
      githubId: users.githubId,
      googleId: users.googleId,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      providers: {
        github: !!user.githubId,
        google: !!user.googleId,
      },
    },
  });
}
