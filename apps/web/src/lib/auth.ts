import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import {
  handleOAuthUser,
  linkProviderToUser,
  parseGitHubProfile,
  parseGoogleProfile,
  getUserById,
} from "@/lib/oauth-user";
import {
  clearMfaStampCookie,
  readMfaStampVerified,
  verifyMfaStamp,
} from "@/lib/mfa-stamp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required behind reverse proxies (Dokploy / Traefik / Cloudflare)
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
      authorization: { params: { scope: "read:user" } },
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
        const isLinking = Boolean(session?.user?.id && session.user.mfaVerified);

        // Linking runs here (needs live session). Fresh sign-in DB work is in jwt only.
        if (isLinking) {
          if (account.provider === "github") {
            const parsed = parseGitHubProfile(profile as Record<string, unknown>);
            await linkProviderToUser(
              session!.user!.id,
              "github",
              parsed
            );
          } else if (account.provider === "google") {
            const parsed = parseGoogleProfile(profile as Record<string, unknown>);
            await linkProviderToUser(
              session!.user!.id,
              "google",
              parsed
            );
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
      if (account && profile) {
        let dbUser = null;
        const isLinking = Boolean(token.id && token.mfaVerified);

        if (isLinking && token.id) {
          dbUser = await getUserById(token.id as string);
        } else if (account.provider === "github") {
          const parsed = parseGitHubProfile(profile as Record<string, unknown>);
          dbUser = await handleOAuthUser("github", parsed);
          token.mfaVerified = false;
          try {
            await clearMfaStampCookie();
          } catch {
            // ignore (edge / no cookie store)
          }
        } else if (account.provider === "google") {
          const parsed = parseGoogleProfile(profile as Record<string, unknown>);
          dbUser = await handleOAuthUser("google", parsed);
          token.mfaVerified = false;
          try {
            await clearMfaStampCookie();
          } catch {
            // ignore
          }
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.plan = dbUser.plan;
          token.accountStatus = dbUser.accountStatus;
          token.mfaEnrolled = !!(dbUser.totpSecret && dbUser.totpEnabled);
          if (!isLinking) {
            token.mfaVerified = false;
          }
        }
      }

      if (trigger === "update" && token.id) {
        const dbUser = await getUserById(token.id as string);
        if (dbUser) {
          token.mfaEnrolled = !!(dbUser.totpSecret && dbUser.totpEnabled);
          token.role = dbUser.role;
          token.plan = dbUser.plan;
          token.accountStatus = dbUser.accountStatus;
        }

        // Signed proof from enroll/verify APIs — do not trust bare client flags
        const proof =
          session &&
          typeof (session as { mfaProof?: unknown }).mfaProof === "string"
            ? (session as { mfaProof: string }).mfaProof
            : undefined;

        if (proof && (await verifyMfaStamp(proof, token.id as string))) {
          token.mfaVerified = true;
          token.mfaEnrolled = true;
        }
      }

      if (token.id) {
        try {
          const stamped = await readMfaStampVerified(token.id as string);
          if (stamped) {
            token.mfaVerified = true;
            token.mfaEnrolled = true;
          }
        } catch {
          // ignore (edge / no cookie store)
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
        session.user.mfaEnrolled = Boolean(token.mfaEnrolled);
        session.user.mfaVerified = Boolean(token.mfaVerified);
        session.user.accountStatus = (token.accountStatus as string) ?? "active";
      }
      return session;
    },
  },
});
