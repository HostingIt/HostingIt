import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Dedupe auth() within a single RSC request tree. */
export const getSession = cache(async () => auth());

/**
 * Session with role, plan and account status re-read from the database.
 * The JWT copies of those fields are only refreshed on sign-in, so a
 * suspension, downgrade or admin demotion would otherwise lag by up to the
 * session lifetime.
 */
const getFreshSession = cache(async () => {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const [row] = await db
    .select({
      role: users.role,
      plan: users.plan,
      accountStatus: users.accountStatus,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!row) return null;

  return {
    ...session,
    user: {
      ...session.user,
      role: row.role,
      plan: row.plan,
      accountStatus: row.accountStatus,
    },
  };
});

export async function requireAuth() {
  const session = await getFreshSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.accountStatus === "suspended") {
    redirect("/login?error=suspended");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}
