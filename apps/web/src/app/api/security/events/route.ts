import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, apps } from "@/db/schema";
import { requireApiUser } from "@/lib/api-auth";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  filter: z
    .enum(["all", "auth", "apps", "billing", "account"])
    .default("all"),
  appId: z.string().uuid().optional(),
});

/** Filter groups map to action prefixes (auth also covers security + github events). */
const FILTER_PREFIXES: Record<string, string[]> = {
  all: [],
  auth: ["auth.", "security.", "github."],
  apps: ["app."],
  billing: ["billing."],
  account: ["account."],
};

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
    filter: params.get("filter") ?? undefined,
    appId: params.get("appId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 }
    );
  }

  const { page, pageSize, filter, appId } = parsed.data;

  const conditions: SQL[] = [eq(auditLogs.userId, authResult.user.id)];
  const prefixes = FILTER_PREFIXES[filter];
  if (prefixes.length > 0) {
    const prefixMatch = or(
      ...prefixes.map((prefix) => like(auditLogs.action, `${prefix}%`))
    );
    if (prefixMatch) conditions.push(prefixMatch);
  }
  if (appId) {
    conditions.push(eq(auditLogs.appId, appId));
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      metadata: auditLogs.metadata,
      ip: auditLogs.ip,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      appId: auditLogs.appId,
      appName: apps.name,
    })
    .from(auditLogs)
    .leftJoin(apps, eq(auditLogs.appId, apps.id))
    .where(where)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(auditLogs)
    .where(where);

  return NextResponse.json({
    events: rows,
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
