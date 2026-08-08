import { eq, and, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export type OAuthProvider = "github" | "google";

export interface OAuthProfile {
  email: string;
  name: string | null;
  providerId: string;
}

function isPlaceholderEmail(email: string): boolean {
  const e = email.toLowerCase();
  return (
    e.endsWith("@users.noreply.github.com") ||
    e.endsWith("@github.local") ||
    e === "unknown@github.local"
  );
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

/**
 * Prefer public profile email; otherwise fetch primary verified email with the
 * OAuth token (requires user:email scope).
 */
export async function resolveGitHubProfile(
  profile: Record<string, unknown>,
  accessToken?: string | null
): Promise<OAuthProfile> {
  const base = parseGitHubProfile(profile);
  if (!isPlaceholderEmail(base.email) || !accessToken) {
    return base;
  }

  try {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!res.ok) return base;

    const emails = (await res.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    const pick =
      emails.find((e) => e.primary && e.verified) ??
      emails.find((e) => e.verified) ??
      emails[0];

    if (pick?.email) {
      return { ...base, email: pick.email.toLowerCase() };
    }
  } catch {
    // fall through
  }

  return base;
}

export function parseGoogleProfile(profile: Record<string, unknown>): OAuthProfile {
  return {
    email: String(profile.email ?? "").toLowerCase(),
    name: (profile.name as string | undefined) ?? null,
    providerId: String(profile.sub ?? profile.id),
  };
}

function providerColumn(provider: OAuthProvider) {
  return provider === "github" ? users.githubId : users.googleId;
}

/** Promote ADMIN_EMAIL match to admin even if the account was created earlier. */
async function ensureAdminBootstrap(user: User): Promise<User> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail || user.email.toLowerCase() !== adminEmail) {
    return user;
  }
  if (user.role === "admin") {
    return user;
  }

  await db
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return { ...user, role: "admin" };
}

async function clearProviderId(
  provider: OAuthProvider,
  providerId: string,
  exceptUserId: string
): Promise<void> {
  const col = providerColumn(provider);
  await db
    .update(users)
    .set(
      provider === "github"
        ? { githubId: null, updatedAt: new Date() }
        : { googleId: null, updatedAt: new Date() }
    )
    .where(and(eq(col, providerId), ne(users.id, exceptUserId)));
}

async function attachProvider(
  userId: string,
  provider: OAuthProvider,
  providerId: string,
  name: string | null
): Promise<User> {
  await clearProviderId(provider, providerId, userId);

  const updates: Partial<User> = {
    emailVerified: true,
    updatedAt: new Date(),
  };

  if (provider === "github") {
    Object.assign(updates, { githubId: providerId, githubAccessToken: null });
  } else {
    Object.assign(updates, { googleId: providerId });
  }

  const [current] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (name && !current?.name) {
    Object.assign(updates, { name });
  }

  await db.update(users).set(updates).where(eq(users.id, userId));

  const [fresh] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!fresh) throw new Error("User not found after provider attach");
  return fresh;
}

function accountPriority(user: User): number {
  let score = 0;
  if (user.totpSecret && user.totpEnabled) score += 8;
  if (user.googleId) score += 4;
  if (user.githubId) score += 2;
  if (!isPlaceholderEmail(user.email)) score += 1;
  return score;
}

/**
 * Sign-in / sign-up via OAuth.
 * Real email wins: Google account with MFA must be reused when GitHub shares that email.
 */
export async function handleOAuthUser(
  provider: OAuthProvider,
  profile: OAuthProfile
): Promise<User> {
  const { email, name, providerId } = profile;

  if (!email) {
    throw new Error("OAuth provider did not return an email");
  }

  const col = providerColumn(provider);

  const [byProvider] = await db
    .select()
    .from(users)
    .where(eq(col, providerId))
    .limit(1);

  const [byEmail] = isPlaceholderEmail(email)
    ? [undefined]
    : await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Same email as an existing account → that account (keeps MFA). Move provider onto it.
  if (byEmail) {
    if (byEmail.accountStatus === "suspended") {
      throw new Error("ACCOUNT_SUSPENDED");
    }
    return ensureAdminBootstrap(
      await attachProvider(byEmail.id, provider, providerId, name)
    );
  }

  if (byProvider) {
    if (byProvider.accountStatus === "suspended") {
      throw new Error("ACCOUNT_SUSPENDED");
    }

    // Upgrade placeholder email if we finally have a real one
    if (
      !isPlaceholderEmail(email) &&
      isPlaceholderEmail(byProvider.email) &&
      byProvider.email !== email
    ) {
      const [emailTaken] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (emailTaken && emailTaken.id !== byProvider.id) {
        if (emailTaken.accountStatus === "suspended") {
          throw new Error("ACCOUNT_SUSPENDED");
        }
        // Prefer Google+MFA account over a noreply GitHub stub
        const keep =
          accountPriority(emailTaken) >= accountPriority(byProvider)
            ? emailTaken
            : byProvider;
        return ensureAdminBootstrap(
          await attachProvider(keep.id, provider, providerId, name)
        );
      }
      await db
        .update(users)
        .set({ email, emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, byProvider.id));
    }

    return ensureAdminBootstrap(
      await attachProvider(byProvider.id, provider, providerId, name)
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      name,
      emailVerified: true,
      role: adminEmail === email.toLowerCase() ? "admin" : "user",
      githubId: provider === "github" ? providerId : null,
      githubAccessToken: null,
      googleId: provider === "google" ? providerId : null,
    })
    .returning();

  return newUser;
}

export async function linkProviderToUser(
  userId: string,
  provider: OAuthProvider,
  profile: OAuthProfile
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
    .where(eq(providerColumn(provider), profile.providerId))
    .limit(1);

  if (owner && owner.id !== userId) {
    // If the other row is a weak noreply stub, reclaim the provider id
    if (
      accountPriority(currentUser) > accountPriority(owner) ||
      isPlaceholderEmail(owner.email)
    ) {
      return attachProvider(userId, provider, profile.providerId, profile.name);
    }
    throw new Error("PROVIDER_IN_USE");
  }

  return attachProvider(userId, provider, profile.providerId, profile.name);
}

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function getUserByProvider(
  provider: OAuthProvider,
  providerId: string
): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(providerColumn(provider), providerId))
    .limit(1);
  return user ?? null;
}
