import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user || !user.passwordHash) return null;
        if (!user.emailVerified) return null;
        if (user.accountStatus === "suspended") return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
        };
      },
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.plan = (user as { plan?: string }).plan ?? "free";
      }

      if (account?.provider === "github" && profile) {
        const githubId = profile.id?.toString();
        const email =
          profile.email ??
          (profile as { login?: string }).login + "@users.noreply.github.com";

        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (existing) {
          await db
            .update(users)
            .set({
              githubId,
              githubAccessToken: account.access_token,
              emailVerified: true,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id));

          token.id = existing.id;
          token.role = existing.role;
          token.plan = existing.plan;
        } else {
          const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
          const [newUser] = await db
            .insert(users)
            .values({
              email: email.toLowerCase(),
              name: profile.name ?? (profile as { login?: string }).login,
              emailVerified: true,
              githubId,
              githubAccessToken: account.access_token,
              role: adminEmail === email.toLowerCase() ? "admin" : "user",
            })
            .returning();

          token.id = newUser.id;
          token.role = newUser.role;
          token.plan = newUser.plan;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
      }
      return session;
    },
  },
});
