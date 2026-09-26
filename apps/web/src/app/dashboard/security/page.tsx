import Link from "next/link";
import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import {
  Boxes,
  CircleStop,
  CreditCard,
  Fingerprint,
  Globe,
  KeyRound,
  Link2,
  LogIn,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  Unlink,
  Variable,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { apps, auditLogs, users } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "auth", label: "Sign-in & security" },
  { key: "apps", label: "Apps" },
  { key: "billing", label: "Billing" },
  { key: "account", label: "Account" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const FILTER_PREFIXES: Record<FilterKey, string[]> = {
  all: [],
  auth: ["auth.", "security.", "github."],
  apps: ["app."],
  billing: ["billing."],
  account: ["account."],
};

type ActionTone = "default" | "danger";

const ACTION_META: Record<string, { label: string; icon: LucideIcon; tone?: ActionTone }> = {
  "auth.login": { label: "Signed in", icon: LogIn },
  "auth.logout": { label: "Signed out", icon: LogIn },
  "auth.2fa.enabled": { label: "Two-factor enabled", icon: KeyRound },
  "auth.2fa.verify_failed": {
    label: "Failed 2FA attempt",
    icon: ShieldAlert,
    tone: "danger",
  },
  "security.provider_linked": { label: "Provider linked", icon: Link2 },
  "security.provider_unlinked": { label: "Provider unlinked", icon: Unlink },
  "app.create": { label: "App created", icon: Rocket },
  "app.delete": { label: "App deleted", icon: Trash2, tone: "danger" },
  "app.start": { label: "App started", icon: Play },
  "app.stop": { label: "App stopped", icon: Square },
  "app.restart": { label: "App restarted", icon: RotateCcw },
  "app.cancel": { label: "Deployment cancelled", icon: CircleStop },
  "app.redeploy": { label: "Redeploy triggered", icon: RefreshCw },
  "app.env_update": { label: "Environment variables updated", icon: Variable },
  "app.settings_update": { label: "Settings updated", icon: Settings },
  "app.domain_update": { label: "Custom domain updated", icon: Globe },
  "billing.request": { label: "Plan upgrade requested", icon: CreditCard },
  "github.install": { label: "GitHub App installed", icon: Boxes },
  "github.uninstall": { label: "GitHub App removed", icon: Boxes, tone: "danger" },
};

function metaFor(action: string) {
  return (
    ACTION_META[action] ?? { label: action, icon: Fingerprint, tone: "default" as const }
  );
}

function describeMetadata(metadata: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (typeof metadata.provider === "string") {
    parts.push(metadata.provider);
  }
  if (typeof metadata.repo === "string") {
    parts.push(
      typeof metadata.branch === "string"
        ? `${metadata.repo}@${metadata.branch}`
        : metadata.repo
    );
  }
  if (typeof metadata.domain === "string") parts.push(metadata.domain);
  if (typeof metadata.plan === "string") {
    parts.push(
      typeof metadata.method === "string"
        ? `${metadata.plan} via ${metadata.method}`
        : metadata.plan
    );
  }
  if (Array.isArray(metadata.envKeys) && metadata.envKeys.length > 0) {
    const keys = metadata.envKeys.filter((k): k is string => typeof k === "string");
    const shown = keys.slice(0, 3).join(", ");
    parts.push(keys.length > 3 ? `${shown} +${keys.length - 3} more` : shown);
  }
  if (metadata.buildSecretsChanged === true) parts.push("build secrets");
  if (metadata.buildArgsChanged === true) parts.push("build args");
  if (typeof metadata.branch === "string" && !parts.some((p) => p.includes("@"))) {
    parts.push(`branch ${metadata.branch}`);
  }
  if (typeof metadata.installationId === "string") {
    parts.push(`installation ${metadata.installationId}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function timeAgo(date: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function securityUrl(
  filter: FilterKey,
  page: number,
  appId?: string
): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (appId) params.set("app", appId);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/dashboard/security?${query}` : "/dashboard/security";
}

const EMPTY_COPY: Record<FilterKey, string> = {
  all: "Sign-ins, deploys, and changes to your apps will show up here.",
  auth: "No sign-in or security events match this filter.",
  apps: "No app events match this filter.",
  billing: "No billing events match this filter.",
  account: "No account events match this filter.",
};

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; app?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  const filter: FilterKey = FILTERS.some((f) => f.key === params.filter)
    ? (params.filter as FilterKey)
    : "all";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const ownedApps = await db
    .select({ id: apps.id, name: apps.name })
    .from(apps)
    .where(eq(apps.userId, session.user.id));
  const appId =
    params.app && ownedApps.some((a) => a.id === params.app)
      ? params.app
      : undefined;

  const conditions: SQL[] = [eq(auditLogs.userId, session.user.id)];
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

  const [events, [totals], [user], [{ value: appCount }]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
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
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    db
      .select({ value: count() })
      .from(apps)
      .where(eq(apps.userId, session.user.id)),
  ]);

  const total = totals?.value ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (requestedPage > pages) {
    redirect(securityUrl(filter, pages, appId));
  }
  const page = requestedPage;
  const providers = [user?.githubId ? "GitHub" : null, user?.googleId ? "Google" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        title="Security"
        description="Sign-in activity, security events, and account protection for your workspace."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-elevated border-border">
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Two-factor auth
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {user?.totpEnabled ? "Enabled" : "Not enrolled"}
              </p>
              {user?.totpEnabled ? (
                <p className="mt-2 text-xs text-muted">
                  Authenticator app required at sign-in
                </p>
              ) : (
                <Link
                  href="/dashboard/settings"
                  className="mt-2 inline-block text-xs text-accent hover:underline"
                >
                  Set up 2FA →
                </Link>
              )}
            </div>
            <ShieldCheck
              className={cn(
                "h-6 w-6 shrink-0",
                user?.totpEnabled ? "text-accent" : "text-muted"
              )}
              aria-hidden
            />
          </CardContent>
        </Card>

        <Card className="card-elevated border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Sign-in providers
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {providers || "None"}
            </p>
            <p className="mt-2 text-xs text-muted">
              Linked in Settings → Connected providers
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Apps protected
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {appCount}
            </p>
            <p className="mt-2 text-xs text-muted">
              Member since {user?.createdAt ? user.createdAt.getFullYear() : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={securityUrl(f.key, 1, appId)}
              aria-current={filter === f.key ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-border text-muted hover:bg-surface-2 hover:text-ink"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {ownedApps.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={securityUrl(filter, 1)}
              aria-current={!appId ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                !appId
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-border text-muted hover:bg-surface-2 hover:text-ink"
              )}
            >
              All apps
            </Link>
            {ownedApps.map((app) => (
              <Link
                key={app.id}
                href={securityUrl(filter, 1, app.id)}
                aria-current={appId === app.id ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  appId === app.id
                    ? "border-accent bg-accent/10 text-ink"
                    : "border-border text-muted hover:bg-surface-2 hover:text-ink"
                )}
              >
                {app.name}
              </Link>
            ))}
          </div>
        )}

        <Card className="card-elevated min-w-0 overflow-hidden border-border">
          {events.length === 0 ? (
            <CardContent className="flex flex-col items-center py-16 text-center">
              <ShieldCheck className="h-8 w-8 text-muted" aria-hidden />
              <h3 className="mt-4 font-display text-xl font-bold text-ink">
                No security activity yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted">
                {EMPTY_COPY[filter]}
              </p>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">App</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const { label, icon: Icon, tone } = metaFor(event.action);
                  const detail = describeMetadata(event.metadata ?? {});
                  const when = new Date(event.createdAt);
                  const metaJson = event.metadata
                    ? JSON.stringify(event.metadata, null, 2)
                    : null;
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="max-w-[18rem] sm:max-w-md">
                        <div className="flex items-start gap-3">
                          <Icon
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              tone === "danger" ? "text-red-500" : "text-accent"
                            )}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                tone === "danger" ? "text-red-500" : "text-ink"
                              )}
                            >
                              {label}
                            </p>
                            {detail && (
                              <p className="break-words text-xs text-muted">{detail}</p>
                            )}
                            {metaJson && metaJson !== "{}" && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-muted hover:text-ink">
                                  Details
                                </summary>
                                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-surface-2 p-2 font-mono text-[11px] text-muted">
                                  {metaJson}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted md:table-cell">
                        {event.appName ?? "—"}
                      </TableCell>
                      <TableCell className="hidden break-all font-mono text-xs text-muted lg:table-cell">
                        {event.ip ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted">
                        <span title={when.toISOString()}>{timeAgo(when)}</span>
                        <p className="mt-0.5 text-[11px] text-muted/80">
                          {when.toLocaleString()}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              {total} events · page {page} of {pages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={securityUrl(filter, page - 1, appId)}
                  className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
                >
                  ← Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link
                  href={securityUrl(filter, page + 1, appId)}
                  className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
                >
                  Next →
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
