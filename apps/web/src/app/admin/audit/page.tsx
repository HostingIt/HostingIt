import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, ilike, like, or, type SQL } from "drizzle-orm";
import { Search, X } from "lucide-react";
import { z } from "zod";
import { db } from "@/db";
import { apps, auditLogs, users } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ActivityLog } from "@/components/security/activity-log";
import { requestNow } from "@/components/security/audit-meta";
import {
  AUDIT_FILTERS,
  AUDIT_FILTER_PREFIXES,
  isAuditFilterKey,
  type AuditFilterKey,
} from "@/lib/audit-filters";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

const AUDIT_ADMIN_FILTERS = [
  ...AUDIT_FILTERS,
  { key: "admin", label: "Admin actions" },
] as const;
type AdminFilterKey = AuditFilterKey | "admin";

function auditUrl(input: {
  filter: AdminFilterKey;
  page?: number;
  user?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (input.filter !== "all") params.set("filter", input.filter);
  if (input.user) params.set("user", input.user);
  if (input.q) params.set("q", input.q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; user?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter: AdminFilterKey =
    params.filter === "admin" ? "admin" : isAuditFilterKey(params.filter) ? params.filter : "all";
  const userId = z.string().uuid().safeParse(params.user).success ? params.user : undefined;
  const q = params.q?.trim().slice(0, 120) || undefined;
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const conditions: SQL[] = [];
  const prefixes = filter === "admin" ? ["admin."] : AUDIT_FILTER_PREFIXES[filter];
  if (prefixes.length > 0) {
    const match = or(...prefixes.map((p) => like(auditLogs.action, `${p}%`)));
    if (match) conditions.push(match);
  }
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    const match = or(
      ilike(users.email, pattern),
      ilike(auditLogs.ip, pattern),
      ilike(auditLogs.action, pattern),
      ilike(apps.name, pattern)
    );
    if (match) conditions.push(match);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [events, [totals], focusUser] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        ip: auditLogs.ip,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        appId: auditLogs.appId,
        appName: apps.name,
        userId: auditLogs.userId,
        userEmail: users.email,
      })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.userId))
      .leftJoin(apps, eq(apps.id, auditLogs.appId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(PAGE_SIZE)
      .offset((requestedPage - 1) * PAGE_SIZE),
    db
      .select({ value: count() })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.userId))
      .leftJoin(apps, eq(apps.id, auditLogs.appId))
      .where(where),
    userId
      ? db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const total = totals?.value ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (requestedPage > pages) {
    redirect(auditUrl({ filter, page: pages, user: userId, q }));
  }
  const page = requestedPage;
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(total, page * PAGE_SIZE);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Audit log"
        description="Security and lifecycle events across every account, including actions taken by admins."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Event categories" className="nice-scroll -mx-1 overflow-x-auto px-1">
          <div className="inline-flex gap-1 rounded-full border border-border bg-surface p-1">
            {AUDIT_ADMIN_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={auditUrl({ filter: f.key, user: userId, q })}
                aria-current={filter === f.key ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  filter === f.key
                    ? "bg-ink text-background"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </nav>

        <form action="/admin/audit" method="get" className="relative lg:w-80">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          {userId && <input type="hidden" name="user" value={userId} />}
          <label>
            <span className="sr-only">Search events</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={q}
              placeholder="Email, IP, app, or action…"
              className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus-visible:border-accent"
            />
          </label>
        </form>
      </div>

      {(focusUser || q) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {focusUser && (
            <Link
              href={auditUrl({ filter, q })}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-ink hover:bg-surface-2"
            >
              User: {focusUser.email}
              <X className="h-3.5 w-3.5 text-muted" aria-label="Clear user filter" />
            </Link>
          )}
          {q && (
            <Link
              href={auditUrl({ filter, user: userId })}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-ink hover:bg-surface-2"
            >
              Search: {q}
              <X className="h-3.5 w-3.5 text-muted" aria-label="Clear search" />
            </Link>
          )}
        </div>
      )}

      <Card className="card-elevated min-w-0 overflow-hidden border-border">
        <ActivityLog
          events={events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
          serverNow={requestNow()}
          showUser
          userHrefPrefix="/admin/users?user="
          emptyTitle="No matching events"
          emptyCopy="Try another category or clear the search."
        />
      </Card>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {firstShown}–{lastShown} of {total} events
          </p>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={auditUrl({ filter, page: page - 1, user: userId, q })}
                  className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
                >
                  ← Newer
                </Link>
              )}
              <span className="text-xs text-muted">
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link
                  href={auditUrl({ filter, page: page + 1, user: userId, q })}
                  className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
                >
                  Older →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
