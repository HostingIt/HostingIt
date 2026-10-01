import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import type { Application } from "@hostingit/dokploy-client";
import {
  Boxes,
  Cpu,
  ExternalLink,
  GitBranch,
  History,
  KeyRound,
  Lock,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/db";
import { apps, auditLogs, deployments } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LimitStatusChip } from "@/components/security/limit-status-chip";
import { metaFor, timeAgo } from "@/components/security/audit-meta";
import { getAppPublicUrl, getDokployClient } from "@/lib/dokploy";
import {
  inspectAppLimits,
  unknownLimitReport,
  type AppLimitReport,
} from "@/lib/app-resources";
import { deploymentStatusForBadge } from "@/lib/deployments";
import { parseEnvString } from "@/lib/env-vars";
import { formatCpu, formatMemory, LIMIT_STATUS_COPY } from "@/lib/resource-limits";

type AppRow = typeof apps.$inferSelect;

interface InstanceDetails {
  app: AppRow;
  remote: Application | null;
  limits: AppLimitReport;
  lastDeploy: {
    status: (typeof deployments.$inferSelect)["status"];
    startedAt: Date;
  } | null;
  lastEvent: { action: string; createdAt: Date } | null;
}

async function loadInstance(app: AppRow, plan: string): Promise<InstanceDetails> {
  const [lastDeployRows, lastEventRows] = await Promise.all([
    db
      .select({ status: deployments.status, startedAt: deployments.startedAt })
      .from(deployments)
      .where(eq(deployments.appId, app.id))
      .orderBy(desc(deployments.startedAt))
      .limit(1),
    db
      .select({ action: auditLogs.action, createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(and(eq(auditLogs.appId, app.id), eq(auditLogs.userId, app.userId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1),
  ]);

  let remote: Application | null = null;
  let limits: AppLimitReport;
  try {
    const dokploy = getDokployClient();
    remote = await dokploy.getApplication(app.dokployAppId).catch(() => null);
    limits = remote
      ? await inspectAppLimits(
          dokploy,
          { dokployAppId: app.dokployAppId, status: app.status, remote },
          plan
        )
      : unknownLimitReport(plan);
  } catch {
    limits = unknownLimitReport(plan);
  }

  return {
    app,
    remote,
    limits,
    lastDeploy: lastDeployRows[0] ?? null,
    lastEvent: lastEventRows[0] ?? null,
  };
}

function countKeys(raw: string | null | undefined): number | null {
  if (raw === undefined) return null;
  return parseEnvString(raw).length;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Boxes;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="mt-0.5 text-sm text-ink">{children}</dd>
      </div>
    </div>
  );
}

function InstanceCard({ details }: { details: InstanceDetails }) {
  const { app, remote, limits, lastDeploy, lastEvent } = details;
  const url = getAppPublicUrl(app);
  const hostname = url.replace(/^https?:\/\//, "");
  const envCount = countKeys(remote ? remote.env ?? "" : undefined);
  const secretCount = countKeys(remote ? remote.buildSecrets ?? "" : undefined);
  const argCount = countKeys(remote ? remote.buildArgs ?? "" : undefined);
  const runtimeDiffers =
    limits.runtime &&
    (limits.runtime.memoryBytes !== limits.expected.memoryBytes ||
      limits.runtime.nanoCpus !== limits.expected.nanoCpus);

  return (
    <Card className="card-elevated flex h-full flex-col border-border">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/dashboard/apps/${app.id}`}
              className="block truncate font-display text-lg font-semibold text-ink hover:underline"
            >
              {app.name}
            </Link>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex max-w-full items-center gap-1 font-mono text-xs text-accent hover:underline"
            >
              <span className="truncate">{hostname}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          </div>
          <Badge status={app.status} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            <Lock className="h-3 w-3" aria-hidden />
            HTTPS
          </span>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted">
            {app.customDomain ? "Custom domain" : "Free subdomain"}
          </span>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted">
            Isolated container
          </span>
        </div>

        <dl className="mt-3 divide-y divide-border border-t border-border">
          <Row icon={Cpu} label="Resources">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {formatCpu(limits.expected.nanoCpus)} ·{" "}
                {formatMemory(limits.expected.memoryBytes)} RAM
              </span>
              <LimitStatusChip status={limits.status} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {LIMIT_STATUS_COPY[limits.status].hint}
              {limits.status === "restart_required" && (
                <>
                  {" "}
                  <Link
                    href={`/dashboard/apps/${app.id}`}
                    className="text-accent hover:underline"
                  >
                    Restart app →
                  </Link>
                </>
              )}
            </p>
            {runtimeDiffers && limits.runtime && (
              <p className="mt-1 text-xs text-muted">
                Running with {formatCpu(limits.runtime.nanoCpus)} ·{" "}
                {formatMemory(limits.runtime.memoryBytes)}
              </p>
            )}
          </Row>

          <Row icon={GitBranch} label="Source">
            <span className="break-all font-mono text-xs">
              {app.githubOwner}/{app.githubRepo}@{app.githubBranch}
            </span>
            {remote && (
              <span className="mt-0.5 block text-xs text-muted">
                Auto-deploy on push: {remote.autoDeploy === false ? "off" : "on"}
              </span>
            )}
          </Row>

          <Row icon={KeyRound} label="Secrets (names and values never shown)">
            {envCount === null ? (
              <span className="text-muted">Unavailable</span>
            ) : (
              <span>
                {plural(envCount, "runtime variable")} ·{" "}
                {plural(secretCount ?? 0, "build secret")} ·{" "}
                {plural(argCount ?? 0, "build arg")}
              </span>
            )}
          </Row>

          <Row icon={Rocket} label="Last deployment">
            {lastDeploy ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <Badge status={deploymentStatusForBadge(lastDeploy.status)} />
                <span className="text-xs text-muted">{timeAgo(lastDeploy.startedAt)}</span>
              </span>
            ) : (
              <span className="text-muted">Never deployed</span>
            )}
          </Row>

          <Row icon={History} label="Last activity">
            {lastEvent ? (
              <span>
                {metaFor(lastEvent.action).label}{" "}
                <span className="text-xs text-muted">· {timeAgo(lastEvent.createdAt)}</span>
              </span>
            ) : (
              <span className="text-muted">No events yet</span>
            )}
          </Row>
        </dl>

        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-xs">
          <Link href={`/dashboard/apps/${app.id}`} className="text-accent hover:underline">
            Open app
          </Link>
          <Link
            href={`/dashboard/security?app=${app.id}`}
            className="text-accent hover:underline"
          >
            View activity
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export async function InstancesSection({
  userId,
  plan,
}: {
  userId: string;
  plan: string;
}) {
  const userApps = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, userId))
    .orderBy(desc(apps.createdAt));

  if (userApps.length === 0) {
    return (
      <Card className="border-dashed border-border bg-surface/50">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <ShieldCheck className="h-7 w-7 text-muted" aria-hidden />
          <p className="mt-3 text-sm text-muted">
            No instances yet. Each app you deploy shows up here with its
            limits, secrets, and deploy status.
          </p>
          <Link
            href="/dashboard/apps/new"
            className="mt-3 text-sm text-accent hover:underline"
          >
            Deploy an app →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const results = await Promise.allSettled(
    userApps.map((app) => loadInstance(app, plan))
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {results.map((result, i) =>
        result.status === "fulfilled" ? (
          <InstanceCard key={userApps[i].id} details={result.value} />
        ) : (
          <Card key={userApps[i].id} className="border-border">
            <CardContent className="p-5 text-sm text-muted">
              Could not load details for {userApps[i].name}.
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

export function InstancesSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Loading instances">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton-text h-80 w-full rounded-[14px]" />
      ))}
    </div>
  );
}
