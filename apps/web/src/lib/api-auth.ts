import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { readMfaStampVerified } from "@/lib/mfa-stamp";

export type ApiUser = {
  id: string;
  email: string;
  role: string;
  plan: string;
  mfaEnrolled: boolean;
  mfaVerified: boolean;
  accountStatus: string;
};

type AuthOptions = {
  /** Allow callers that completed OAuth but not TOTP yet (2FA routes only). */
  allowUnverifiedMfa?: boolean;
};

/**
 * Session + active account + MFA for API routes.
 * Prefer this over bare getSession() on mutating/sensitive endpoints.
 */
export async function requireApiUser(
  options: AuthOptions = {}
): Promise<{ user: ApiUser } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      plan: users.plan,
      accountStatus: users.accountStatus,
      totpSecret: users.totpSecret,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!row) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (row.accountStatus === "suspended") {
    return {
      error: NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      ),
    };
  }

  const mfaEnrolled = !!(row.totpSecret && row.totpEnabled);
  const stampOk = await readMfaStampVerified(row.id);
  const mfaVerified =
    Boolean(session.user.mfaVerified) || stampOk;

  if (!options.allowUnverifiedMfa) {
    if (!mfaEnrolled) {
      return {
        error: NextResponse.json(
          { error: "2FA enrollment required", code: "MFA_ENROLL" },
          { status: 403 }
        ),
      };
    }
    if (!mfaVerified) {
      return {
        error: NextResponse.json(
          { error: "2FA verification required", code: "MFA_VERIFY" },
          { status: 403 }
        ),
      };
    }
  }

  return {
    user: {
      id: row.id,
      email: row.email,
      role: row.role,
      plan: row.plan,
      mfaEnrolled,
      mfaVerified,
      accountStatus: row.accountStatus,
    },
  };
}

export async function requireApiAdmin(): Promise<
  { user: ApiUser } | { error: NextResponse }
> {
  const result = await requireApiUser();
  if ("error" in result) return result;
  if (result.user.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
