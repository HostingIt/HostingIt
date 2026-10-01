import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { readMfaStampVerified } from "@/lib/mfa-stamp";

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
      totpSecret: users.totpSecret,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!row) return null;

  const mfaEnrolled = !!(row.totpSecret && row.totpEnabled);
  const mfaVerified =
    Boolean(session.user.mfaVerified) ||
    (mfaEnrolled && (await readMfaStampVerified(session.user.id)));

  return {
    ...session,
    user: {
      ...session.user,
      role: row.role,
      plan: row.plan,
      accountStatus: row.accountStatus,
      mfaEnrolled,
      mfaVerified,
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
  // Middleware enforces this too; repeat it here so a page never renders for
  // a session that skipped 2FA if a route ever falls outside its matcher.
  if (!session.user.mfaEnrolled) {
    redirect("/setup-2fa");
  }
  if (!session.user.mfaVerified) {
    redirect("/login/2fa");
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
