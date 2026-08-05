import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import {
  handleOAuthUser,
  parseGitHubProfile,
  parseGoogleProfile,
  getUserById,
  getUserByProvider,
} from "@/lib/oauth-user";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: "read:user repo" } },
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
        if (account.provider === "github") {
          const parsed = parseGitHubProfile(profile as Record<string, unknown>);
          await handleOAuthUser("github", parsed, account.access_token);
        } else if (account.provider === "google") {
          const parsed = parseGoogleProfile(profile as Record<string, unknown>);
          await handleOAuthUser("google", parsed, account.access_token);
        } else {
          return false;
        }
        return true;
      } catch (error) {
        if (error instanceof Error && error.message === "ACCOUNT_SUSPENDED") {
          return "/login?error=suspended";
        }
        console.error("OAuth signIn error:", error);
        return false;
      }
    },
    async jwt({ token, account, profile, trigger, session }) {
      if (account && profile) {
        let dbUser = null;

        if (account.provider === "github") {
          const parsed = parseGitHubProfile(profile as Record<string, unknown>);
          dbUser =
            (await getUserByProvider("github", parsed.providerId)) ??
            (await handleOAuthUser("github", parsed, account.access_token));
        } else if (account.provider === "google") {
          const parsed = parseGoogleProfile(profile as Record<string, unknown>);
          dbUser =
            (await getUserByProvider("google", parsed.providerId)) ??
            (await handleOAuthUser("google", parsed, account.access_token));
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.plan = dbUser.plan;
          token.mfaEnrolled = !!(dbUser.totpSecret && dbUser.totpEnabled);
          token.mfaVerified = false;
        }
      }

      if (trigger === "update" && session) {
        const updateSession = session as {
          mfaVerified?: boolean;
          mfaEnrolled?: boolean;
        };
        if (updateSession.mfaVerified === true) {
          token.mfaVerified = true;
        }
        if (updateSession.mfaEnrolled === true) {
          token.mfaEnrolled = true;
        }
        if (token.id) {
          const dbUser = await getUserById(token.id as string);
          if (dbUser) {
            token.mfaEnrolled = !!(dbUser.totpSecret && dbUser.totpEnabled);
            token.role = dbUser.role;
            token.plan = dbUser.plan;
          }
        }
      }

      if (token.id && token.mfaEnrolled === undefined) {
        const dbUser = await getUserById(token.id as string);
        token.mfaEnrolled = !!(dbUser?.totpSecret && dbUser?.totpEnabled);
        token.mfaVerified = token.mfaVerified ?? false;
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
      }
      return session;
    },
  },
});
