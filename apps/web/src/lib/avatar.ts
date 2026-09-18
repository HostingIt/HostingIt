import { createHash } from "crypto";

export const AVATAR_MAX_BYTES = 512 * 1024;

export type AvatarImageType = "image/jpeg" | "image/png" | "image/webp";

export function gravatarUrl(email: string, size = 80): string {
  const hash = createHash("md5")
    .update(email.trim().toLowerCase())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}

export function customAvatarUrl(updatedAt: Date | string | number): string {
  const v =
    updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  return `/api/account/avatar?v=${Number.isFinite(v) ? v : Date.now()}`;
}

export function resolveAvatarSrc(input: {
  email: string;
  avatarUpdatedAt?: Date | string | null;
}): string {
  if (input.avatarUpdatedAt) {
    return customAvatarUrl(input.avatarUpdatedAt);
  }
  return gravatarUrl(input.email);
}

export function sniffImageType(buf: Buffer): AvatarImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
