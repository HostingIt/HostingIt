import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export type OAuthProvider = "github" | "google";

export interface OAuthProfile {
  email: string;
  name: string | null;
  providerId: string;
}

export function parseGitHubProfile(profile: Record<string, unknown>): OAuthProfile {
  const login = profile.login as string | undefined;
  const email =
    (profile.email as string | undefined) ??
    (login ? `${login}@users.noreply.github.com` : "unknown@github.local");

  return {
    email: email.toLowerCase(),
    name: (profile.name as string | undefined) ?? login ?? null,
    providerId: String(profile.id),
  };
}

export function parseGoogleProfile(profile: Record<string, unknown>): OAuthProfile {
  return {
    email: String(profile.email ?? "").toLowerCase(),
    name: (profile.name as string | undefined) ?? null,
    providerId: String(profile.sub ?? profile.id),
  };
}

export async function handleOAuthUser(
  provider: OAuthProvider,
  profile: OAuthProfile,
  accessToken?: string | null
): Promise<User> {
  const { email, name, providerId } = profile;

  if (!email) {
    throw new Error("OAuth provider did not return an email");
  }

  const providerMatch =
    provider === "github"
      ? eq(users.githubId, providerId)
      : eq(users.googleId, providerId);

  const [byProvider] = await db
    .select()
    .from(users)
    .where(providerMatch)
    .limit(1);

  if (byProvider) {
    if (byProvider.accountStatus === "suspended") {
      throw new Error("ACCOUNT_SUSPENDED");
    }

    const updates: Partial<User> = {
      emailVerified: true,
      updatedAt: new Date(),
    };

    if (provider === "github" && accessToken) {
      Object.assign(updates, {
        githubId: providerId,
        githubAccessToken: accessToken,
      });
    }
    if (provider === "google") {
      Object.assign(updates, { googleId: providerId });
    }
    if (name && !byProvider.name) {
      Object.assign(updates, { name });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, byProvider.id))
      .returning();

    return updated;
  }

  const [byEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (byEmail) {
    if (byEmail.accountStatus === "suspended") {
      throw new Error("ACCOUNT_SUSPENDED");
    }

    const linkUpdates: Partial<User> = {
      emailVerified: true,
      updatedAt: new Date(),
    };

    if (provider === "github") {
      Object.assign(linkUpdates, {
        githubId: providerId,
        githubAccessToken: accessToken ?? byEmail.githubAccessToken,
      });
    } else {
      Object.assign(linkUpdates, { googleId: providerId });
    }

    const [linked] = await db
      .update(users)
      .set(linkUpdates)
      .where(eq(users.id, byEmail.id))
      .returning();

    return linked;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      name,
      emailVerified: true,
      role: adminEmail === email ? "admin" : "user",
      githubId: provider === "github" ? providerId : null,
      githubAccessToken: provider === "github" ? accessToken : null,
      googleId: provider === "google" ? providerId : null,
    })
    .returning();

  return newUser;
}

export async function linkProviderToUser(
  userId: string,
  provider: OAuthProvider,
  profile: OAuthProfile,
  accessToken?: string | null
): Promise<User> {
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser) {
    throw new Error("User not found");
  }

  if (currentUser.accountStatus === "suspended") {
    throw new Error("ACCOUNT_SUSPENDED");
  }

  const [owner] = await db
    .select()
    .from(users)
    .where(
      provider === "github"
        ? eq(users.githubId, profile.providerId)
        : eq(users.googleId, profile.providerId)
    )
    .limit(1);

  if (owner && owner.id !== userId) {
    throw new Error("PROVIDER_IN_USE");
  }

  const linkUpdates: Partial<User> = {
    emailVerified: true,
    updatedAt: new Date(),
  };

  if (provider === "github") {
    Object.assign(linkUpdates, {
      githubId: profile.providerId,
      githubAccessToken: accessToken ?? currentUser.githubAccessToken,
    });
  } else {
    Object.assign(linkUpdates, { googleId: profile.providerId });
  }

  if (profile.name && !currentUser.name) {
    Object.assign(linkUpdates, { name: profile.name });
  }

  const [linked] = await db
    .update(users)
    .set(linkUpdates)
    .where(eq(users.id, userId))
    .returning();

  return linked;
}

export const getUserById = cache(async (id: string): Promise<User | null> => {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
});

export async function getUserByProvider(
  provider: OAuthProvider,
  providerId: string
): Promise<User | null> {
  const match =
    provider === "github"
      ? eq(users.githubId, providerId)
      : eq(users.googleId, providerId);

  const [user] = await db.select().from(users).where(match).limit(1);
  return user ?? null;
}
