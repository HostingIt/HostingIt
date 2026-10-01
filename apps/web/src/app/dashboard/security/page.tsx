import { Suspense } from "react";
import Link from "next/link";
import { and, count, desc, eq, gte, like, or, type SQL } from "drizzle-orm";
import { KeyRound, LogIn, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { apps, auditLogs, users } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityLog } from "@/components/security/activity-log";
import { AppFilter } from "@/components/security/app-filter";
import {
  InstancesSection,
  InstancesSkeleton,
} from "@/components/security/instances-section";
import { daysAgo, requestNow, timeAgo } from "@/components/security/audit-meta";
import {
  AUDIT_FILTERS,
  AUDIT_FILTER_PREFIXES,
  isAuditFilterKey,
  type AuditFilterKey,
} from "@/lib/audit-filters";
import { describeUserAgent } from "@/lib/user-agent";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const FAILED_2FA_WINDOW_DAYS = 30;

function securityUrl(filter: AuditFilterKey, page: number, appId?: string): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (appId) params.set("app", appId);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/dashboard/security?${query}` : "/dashboard/security";
}

const EMPTY_COPY: Record<AuditFilterKey, string> = {
  all: "Sign-ins, deploys, and changes to your apps will show up here.",
  auth: "No sign-in or security events match this filter.",
  apps: "No app events match this filter.",
  billing: "No billing events match this filter.",
  account: "No account events match this filter.",
};

function SummaryCard({
  label,
  icon: Icon,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  icon: typeof ShieldCheck;
  value: React.ReactNode;
  detail: React.ReactNode;
  tone?: "default" | "good" | "danger";
}) {
  return (
    <Card className="card-elevated border-border">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p
            className={cn(
              "mt-1 truncate font-display text-xl font-bold",
              tone === "danger" ? "text-red-600 dark:text-red-400" : "text-ink"
            )}
          >
            {value}
          </p>
          <div className="mt-1.5 text-xs text-muted">{detail}</div>
        </div>
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            tone === "good" && "text-accent",
            tone === "danger" && "text-red-500",
            tone === "default" && "text-muted"
          )}
          aria-hidden
        />
      </CardContent>
    </Card>
  );
}

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; app?: string }>;
}) {
  const session = await requireAuth();
  const userId = session.user.id;
  const params = await searchParams;

  const filter: AuditFilterKey = isAuditFilterKey(params.filter) ? params.filter : "all";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const ownedApps = await db
    .select({ id: apps.id, name: apps.name })
    .from(apps)
    .where(eq(apps.userId, userId));
  const appId =
    params.app && ownedApps.some((a) => a.id === params.app) ? params.app : undefined;

  const conditions: SQL[] = [eq(auditLogs.userId, userId)];
  const prefixes = AUDIT_FILTER_PREFIXES[filter];
  if (prefixes.length > 0) {
    const prefixMatch = or(...prefixes.map((p) => like(auditLogs.action, `${p}%`)));
    if (prefixMatch) conditions.push(prefixMatch);
  }
  if (appId) conditions.push(eq(auditLogs.appId, appId));
  const where = and(...conditions);

  const failedSince = daysAgo(FAILED_2FA_WINDOW_DAYS);

  const [events, [totals], [user], [lastLogin], [{ value: failed2fa }]] =
    await Promise.all([
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
        })
        .from(auditLogs)
        .leftJoin(apps, eq(auditLogs.appId, apps.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(PAGE_SIZE)
        .offset((requestedPage - 1) * PAGE_SIZE),
      db.select({ value: count() }).from(auditLogs).where(where),
      db
        .select({
          totpEnabled: users.totpEnabled,
          githubId: users.githubId,
          googleId: users.googleId,
          githubInstallationId: users.githubInstallationId,
          plan: users.plan,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
      db
        .select({
          createdAt: auditLogs.createdAt,
          ip: auditLogs.ip,
          userAgent: auditLogs.userAgent,
          metadata: auditLogs.metadata,
        })
        .from(auditLogs)
        .where(and(eq(auditLogs.userId, userId), eq(auditLogs.action, "auth.login")))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1),
      db
        .select({ value: count() })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, userId),
            eq(auditLogs.action, "auth.2fa.verify_failed"),
            gte(auditLogs.createdAt, failedSince)
          )
        ),
    ]);

  const total = totals?.value ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (requestedPage > pages) {
    redirect(securityUrl(filter, pages, appId));
  }
  const page = requestedPage;
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(total, page * PAGE_SIZE);

  const providers = [user?.githubId ? "GitHub" : null, user?.googleId ? "Google" : null]
    .filter(Boolean)
    .join(" + ");
  const lastLoginDevice = lastLogin ? describeUserAgent(lastLogin.userAgent) : null;

  const appFilterHrefs: Record<string, string> = { "": securityUrl(filter, 1) };
  for (const app of ownedApps) appFilterHrefs[app.id] = securityUrl(filter, 1, app.id);

  return (
    <div className="animate-fade-up space-y-10">
      <PageHeader
        title="Security"
        description="Account protection, the security posture of each app instance, and a full activity trail."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Two-factor auth"
          icon={KeyRound}
          tone={user?.totpEnabled ? "good" : "danger"}
          value={user?.totpEnabled ? "Enabled" : "Not enrolled"}
          detail={
            user?.totpEnabled ? (
              "Authenticator code required at every sign-in"
            ) : (
              <Link href="/dashboard/settings" className="text-accent hover:underline">
                Set up 2FA →
              </Link>
            )
          }
        />
        <SummaryCard
          label="Sign-in providers"
          icon={Users}
          value={providers || "None"}
          detail={
            <>
              GitHub App:{" "}
              {user?.githubInstallationId ? "installed" : "not installed"}
            </>
          }
        />
        <SummaryCard
          label="Last sign-in"
          icon={LogIn}
          value={lastLogin ? timeAgo(lastLogin.createdAt) : "—"}
          detail={
            lastLogin ? (
              <span className="block truncate">
                {lastLoginDevice?.label}
                {lastLogin.ip ? (
                  <span className="font-mono"> · {lastLogin.ip}</span>
                ) : null}
              </span>
            ) : (
              "No sign-ins recorded yet"
            )
          }
        />
        <SummaryCard
          label={`Failed 2FA (${FAILED_2FA_WINDOW_DAYS} days)`}
          icon={ShieldAlert}
          tone={failed2fa > 0 ? "danger" : "default"}
          value={failed2fa}
          detail={
            failed2fa > 0 ? (
              <Link href={securityUrl("auth", 1)} className="text-accent hover:underline">
                Review sign-in events →
              </Link>
            ) : (
              "No failed codes. Nice."
            )
          }
        />
      </div>

      <section className="space-y-4" aria-labelledby="instances-heading">
        <div>
          <h2 id="instances-heading" className="font-display text-xl font-semibold text-ink">
            Instances
          </h2>
          <p className="mt-1 text-sm text-muted">
            Each app runs in its own container. Limits are checked live against
            the running container.
          </p>
        </div>
        <Suspense fallback={<InstancesSkeleton count={Math.min(2, Math.max(1, ownedApps.length))} />}>
          <InstancesSection userId={userId} plan={user?.plan ?? "free"} />
        </Suspense>
      </section>

      <section className="space-y-4" aria-labelledby="activity-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="activity-heading" className="font-display text-xl font-semibold text-ink">
              Activity
            </h2>
            <p className="mt-1 text-sm text-muted">
              Select an event to see the device, IP, and exactly what changed.
            </p>
          </div>
          {ownedApps.length > 0 && (
            <AppFilter apps={ownedApps} value={appId ?? ""} hrefFor={appFilterHrefs} />
          )}
        </div>

        <nav
          aria-label="Activity categories"
          className="nice-scroll -mx-1 flex gap-1 overflow-x-auto px-1"
        >
          <div className="inline-flex gap-1 rounded-full border border-border bg-surface p-1">
            {AUDIT_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={securityUrl(f.key, 1, appId)}
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

        <Card className="card-elevated min-w-0 overflow-hidden border-border">
          <ActivityLog
            events={events.map((e) => ({
              ...e,
              createdAt: e.createdAt.toISOString(),
            }))}
            serverNow={requestNow()}
            appHrefPrefix="/dashboard/apps/"
            emptyTitle="No security activity yet"
            emptyCopy={EMPTY_COPY[filter]}
          />
        </Card>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {firstShown}–{lastShown} of {total} events
            </p>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={securityUrl(filter, page - 1, appId)}
                    className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
                  >
                    ← Newer
                  </Link>
                ) : null}
                <span className="text-xs text-muted">
                  Page {page} of {pages}
                </span>
                {page < pages ? (
                  <Link
                    href={securityUrl(filter, page + 1, appId)}
                    className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
                  >
                    Older →
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
