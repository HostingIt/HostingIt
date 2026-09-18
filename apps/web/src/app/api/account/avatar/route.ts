import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireApiUser } from "@/lib/api-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  AVATAR_MAX_BYTES,
  sniffImageType,
} from "@/lib/avatar";

const POST_LIMIT = 10;
const POST_WINDOW_MS = 60 * 60 * 1000;

function toBuffer(data: unknown): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  return null;
}

export async function GET() {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const [row] = await db
    .select({
      avatarData: users.avatarData,
      avatarContentType: users.avatarContentType,
    })
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  const body = toBuffer(row?.avatarData);
  const type = row?.avatarContentType;
  if (!body || !type) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const limited = checkRateLimit(
    `avatar-upload:${authResult.user.id}:${getClientIp(request)}`,
    POST_LIMIT,
    POST_WINDOW_MS
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many avatar uploads. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 512KB or smaller" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImageType(buf);
  if (!contentType) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, or WebP image" },
      { status: 400 }
    );
  }

  const now = new Date();
  await db
    .update(users)
    .set({
      avatarData: buf,
      avatarContentType: contentType,
      avatarUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, authResult.user.id));

  return NextResponse.json({ ok: true, updatedAt: now.toISOString() });
}

export async function DELETE() {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const now = new Date();
  await db
    .update(users)
    .set({
      avatarData: null,
      avatarContentType: null,
      avatarUpdatedAt: null,
      updatedAt: now,
    })
    .where(eq(users.id, authResult.user.id));

  return NextResponse.json({ ok: true });
}
