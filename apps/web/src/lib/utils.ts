import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Max slug length — keeps `fhusr-{slug}` within DNS label limits. */
export const MAX_APP_SLUG_LENGTH = 48;
export const UNIQUE_APP_SUFFIX_LENGTH = 12;

/**
 * DNS-safe app slug: lowercase alphanumerics with internal hyphens;
 * must start and end with a letter or digit.
 */
export const APP_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InvalidAppSlugError extends Error {
  constructor(message = "App name must include at least one letter or number (a-z, 0-9)") {
    super(message);
    this.name = "InvalidAppSlugError";
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_APP_SLUG_LENGTH);
}

export function isValidAppSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= MAX_APP_SLUG_LENGTH &&
    APP_SLUG_RE.test(slug)
  );
}

/** Slugify a display name and reject empty or DNS-invalid results. */
export function slugifyAppName(name: string): string {
  const slug = slugify(name);
  if (!isValidAppSlug(slug)) {
    throw new InvalidAppSlugError();
  }
  return slug;
}

/** Append a collision-resistant suffix while preserving DNS-safe slug rules. */
export function appendUniqueSlugSuffix(baseSlug: string, suffix: string): string {
  if (!isValidAppSlug(baseSlug)) {
    throw new InvalidAppSlugError();
  }

  const normalizedSuffix = suffix
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, UNIQUE_APP_SUFFIX_LENGTH);
  if (normalizedSuffix.length !== UNIQUE_APP_SUFFIX_LENGTH) {
    throw new Error(
      `Unique app suffix must contain at least ${UNIQUE_APP_SUFFIX_LENGTH} alphanumeric characters`
    );
  }

  const maxBaseLength =
    MAX_APP_SLUG_LENGTH - UNIQUE_APP_SUFFIX_LENGTH - 1;
  const truncatedBase = baseSlug
    .slice(0, maxBaseLength)
    .replace(/-+$/, "");
  return `${truncatedBase}-${normalizedSuffix}`;
}

/** Non-throwing check for API validation (e.g. Zod refine). */
export function isValidAppNameForSlug(name: string): boolean {
  if (!/[a-z0-9]/i.test(name)) {
    return false;
  }
  return isValidAppSlug(slugify(name));
}

export function generateToken(length = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
