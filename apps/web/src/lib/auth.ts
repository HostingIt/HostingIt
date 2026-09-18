import NextAuth from "next-auth";
import { headers as nextHeaders } from "next/headers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import {
  handleOAuthUser,
  linkProviderToUser,
  parseGoogleProfile,
  resolveGitHubProfile,
  getUserById,
} from "@/lib/oauth-user";
import {
  clearMfaStampCookie,
  readMfaStampVerified,
  verifyMfaStamp,
} from "@/lib/mfa-stamp";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";

async function sessionIsMfaVerified(
  userId: string | undefined,
  flag: boolean | undefined
): Promise<boolean> {
  if (flag) return true;
  if (!userId) return false;
  try {
    return await readMfaStampVerified(userId);
  } catch {
    return false;
  }
}

async function requestHeaders(): Promise<Headers | undefined> {
  try {
    return await nextHeaders();
  } catch {
    return undefined;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: "read:user user:email" } },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) return false;

      try {
        const session = await auth();
        const mfaOk = await sessionIsMfaVerified(
          session?.user?.id,
          session?.user?.mfaVerified
        );
        const isLinking = Boolean(session?.user?.id && mfaOk);

        // Settings "connect provider" while already MFA-verified
        if (isLinking) {
          if (account.provider === "github") {
            const parsed = await resolveGitHubProfile(
              profile as Record<string, unknown>,
              account.access_token
            );
            await linkProviderToUser(session!.user!.id, "github", parsed);
          } else if (account.provider === "google") {
            const parsed = parseGoogleProfile(
              profile as Record<string, unknown>
            );
            await linkProviderToUser(session!.user!.id, "google", parsed);
          } else {
            return false;
          }
        }
        return true;
      } catch (error) {
        if (error instanceof Error && error.message === "ACCOUNT_SUSPENDED") {
          return "/login?error=suspended";
        }
        if (error instanceof Error && error.message === "PROVIDER_IN_USE") {
          return "/dashboard/settings?error=provider_in_use";
        }
        console.error("OAuth signIn error:", error);
        return false;
      }
    },
    async jwt({ token, account, profile, trigger, session }) {
      // OAuth sign-in / provider link — safe to hit DB (Node runtime).
      if (account && profile) {
        const previousUserId = token.id as string | undefined;
        const previousMfaVerified = await sessionIsMfaVerified(
          previousUserId,
          Boolean(token.mfaVerified)
        );
        const isLinking = Boolean(previousUserId && previousMfaVerified);

        let userId: string | null = null;

        if (isLinking && previousUserId) {
          userId = previousUserId;
        } else if (account.provider === "github") {
          const parsed = await resolveGitHubProfile(
            profile as Record<string, unknown>,
            account.access_token
          );
          const dbUser = await handleOAuthUser("github", parsed);
          userId = dbUser.id;
        } else if (account.provider === "google") {
          const parsed = parseGoogleProfile(
            profile as Record<string, unknown>
          );
          const dbUser = await handleOAuthUser("google", parsed);
          userId = dbUser.id;
        }

        const dbUser = userId ? await getUserById(userId) : null;

        if (!dbUser) {
          // Do not mint a half-baked session.
          return {};
        }

        const sameUser = previousUserId === dbUser.id;
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.plan = dbUser.plan;
        token.accountStatus = dbUser.accountStatus;
        token.mfaEnrolled = !!(dbUser.totpSecret && dbUser.totpEnabled);

        if (isLinking || (sameUser && previousMfaVerified)) {
          token.mfaVerified = true;
          if (isLinking && previousUserId) {
            recordAuditEvent({
              userId: previousUserId,
              action: AUDIT_ACTIONS.securityProviderLinked,
              metadata: { provider: account.provider },
              headers: await requestHeaders(),
            });
          }
        } else {
          // Fresh login — require TOTP again (or enrollment).
          token.mfaVerified = false;
          recordAuditEvent({
            userId: dbUser.id,
            action: AUDIT_ACTIONS.authLogin,
            metadata: { provider: account.provider },
            headers: await requestHeaders(),
          });
          try {
            await clearMfaStampCookie();
          } catch {
            // ignore
          }
        }
      }

      // Client session.update() — Node runtime; sync flags from DB + mfaProof.
      if (trigger === "update" && token.id) {
        const dbUser = await getUserById(token.id as string);
        if (!dbUser) {
          return {};
        }

        token.role = dbUser.role;
        token.plan = dbUser.plan;
        token.accountStatus = dbUser.accountStatus;
        token.mfaEnrolled = !!(dbUser.totpSecret && dbUser.totpEnabled);

        const proof =
          session &&
          typeof (session as { mfaProof?: unknown }).mfaProof === "string"
            ? (session as { mfaProof: string }).mfaProof
            : undefined;

        if (proof && (await verifyMfaStamp(proof, token.id as string))) {
          token.mfaVerified = true;
        } else if (!token.mfaEnrolled) {
          token.mfaVerified = false;
        }
      }

      // Lightweight path used by Edge middleware: cookie stamp only.
      // Never hit the DB here — that wiped sessions after the prior fix.
      if (token.id && token.mfaEnrolled) {
        try {
          const stamped = await readMfaStampVerified(token.id as string);
          if (stamped) {
            token.mfaVerified = true;
          }
        } catch {
          // ignore (e.g. cookies() unavailable)
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (!token.id) {
          // Invalid / cleared token — treat as logged out.
          return { ...session, user: { ...session.user, id: undefined } };
        }
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
        session.user.mfaEnrolled = Boolean(token.mfaEnrolled);
        session.user.mfaVerified = Boolean(token.mfaVerified);
        session.user.accountStatus =
          (token.accountStatus as string) ?? "active";
      }
      return session;
    },
  },
});
