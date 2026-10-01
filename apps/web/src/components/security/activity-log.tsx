"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, Monitor, Smartphone, Tablet, Terminal, ShieldCheck } from "lucide-react";
import {
  dayLabel,
  describeMetadata,
  metaFor,
  metadataEntries,
  timeAgo,
} from "@/components/security/audit-meta";
import { describeUserAgent, type DeviceKind } from "@/lib/user-agent";
import { cn } from "@/lib/utils";

export interface ActivityEvent {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  /** ISO timestamp */
  createdAt: string;
  appId: string | null;
  appName: string | null;
  userEmail?: string | null;
  userId?: string | null;
}

const DEVICE_ICON: Record<DeviceKind, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  bot: Terminal,
  unknown: Monitor,
};

const noopSubscribe = () => () => {};

/**
 * True after hydration. The first client render matches the server (UTC,
 * server clock); afterwards times re-render in the viewer's timezone.
 */
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function localDayKey(date: Date, utc: boolean): string {
  return utc
    ? date.toISOString().slice(0, 10)
    : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupByDay(events: ActivityEvent[], utc: boolean) {
  const groups: Array<{ key: string; date: Date; events: ActivityEvent[] }> = [];
  for (const event of events) {
    const date = new Date(event.createdAt);
    const key = localDayKey(date, utc);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(event);
    else groups.push({ key, date, events: [event] });
  }
  return groups;
}

export function ActivityLog({
  events,
  serverNow,
  showUser = false,
  appHrefPrefix,
  userHrefPrefix,
  emptyTitle = "No activity yet",
  emptyCopy,
}: {
  events: ActivityEvent[];
  /** Server clock (ms) so the first render matches SSR output. */
  serverNow: number;
  showUser?: boolean;
  /** e.g. "/dashboard/apps/" — app id is appended. */
  appHrefPrefix?: string;
  /** e.g. "/admin/users?user=" — user id is appended. */
  userHrefPrefix?: string;
  emptyTitle?: string;
  emptyCopy: string;
}) {
  const isClient = useIsClient();
  const utc = !isClient;
  const now = isClient ? undefined : serverNow;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <ShieldCheck className="h-8 w-8 text-muted" aria-hidden />
        <h3 className="mt-4 font-display text-xl font-bold text-ink">{emptyTitle}</h3>
        <p className="mt-2 max-w-sm text-sm text-muted">{emptyCopy}</p>
      </div>
    );
  }

  const groups = groupByDay(events, utc);

  return (
    <div>
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`day-${group.key}`}>
          <h3
            id={`day-${group.key}`}
            className="sticky top-0 z-[1] border-b border-border bg-surface/95 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted backdrop-blur sm:px-5">
            {utc
              ? group.date.toLocaleDateString("en-US", {
                  timeZone: "UTC",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : dayLabel(group.date)}
          </h3>
          <ul className="divide-y divide-border">
            {group.events.map((event) => (
              <ActivityRow
                key={event.id}
                event={event}
                now={now}
                utc={utc}
                showUser={showUser}
                appHrefPrefix={appHrefPrefix}
                userHrefPrefix={userHrefPrefix}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ActivityRow({
  event,
  now,
  utc,
  showUser,
  appHrefPrefix,
  userHrefPrefix,
}: {
  event: ActivityEvent;
  now: number | undefined;
  utc: boolean;
  showUser: boolean;
  appHrefPrefix?: string;
  userHrefPrefix?: string;
}) {
  const { label, icon: Icon, tone } = metaFor(event.action);
  const metadata = event.metadata ?? {};
  const summary = describeMetadata(metadata);
  const ua = describeUserAgent(event.userAgent);
  const DeviceIcon = DEVICE_ICON[ua.device];
  const when = new Date(event.createdAt);
  const entries = metadataEntries(metadata);
  const exact = utc
    ? `${when.toISOString().replace("T", " ").slice(0, 19)} UTC`
    : when.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      });
  const clock = utc
    ? when.toISOString().slice(11, 16)
    : when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
              tone === "danger" && "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
              tone === "admin" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              tone === "default" && "border-border bg-background text-accent"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  tone === "danger" ? "text-red-600 dark:text-red-400" : "text-ink"
                )}
              >
                {label}
              </p>
              {event.appName && (
                <span className="max-w-[12rem] truncate rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted">
                  {event.appName}
                </span>
              )}
            </div>
            {summary && (
              <p className="mt-0.5 break-words text-xs text-muted">{summary}</p>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {showUser && event.userEmail && (
                <span className="font-medium text-ink/80">{event.userEmail}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <DeviceIcon className="h-3.5 w-3.5" aria-hidden />
                {ua.label}
              </span>
              {event.ip && <span className="font-mono">{event.ip}</span>}
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-2 text-right">
            <div>
              <p className="text-xs font-medium text-ink" title={exact}>
                {timeAgo(when, now)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">{clock}</p>
            </div>
            <ChevronDown
              className="mt-0.5 h-4 w-4 text-muted transition-transform group-open:rotate-180"
              aria-hidden
            />
          </div>
        </summary>

        <div className="border-t border-dashed border-border bg-background/50 px-4 py-3 sm:pl-16 sm:pr-5">
          <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-[max-content_1fr]">
            <dt className="text-muted">When</dt>
            <dd className="text-ink">{exact}</dd>
            {showUser && event.userEmail && (
              <>
                <dt className="text-muted">User</dt>
                <dd className="break-all text-ink">
                  {userHrefPrefix && event.userId ? (
                    <Link href={`${userHrefPrefix}${event.userId}`} className="text-accent hover:underline">
                      {event.userEmail}
                    </Link>
                  ) : (
                    event.userEmail
                  )}
                </dd>
              </>
            )}
            {event.appName && (
              <>
                <dt className="text-muted">App</dt>
                <dd className="text-ink">
                  {appHrefPrefix && event.appId ? (
                    <Link href={`${appHrefPrefix}${event.appId}`} className="text-accent hover:underline">
                      {event.appName}
                    </Link>
                  ) : (
                    event.appName
                  )}
                </dd>
              </>
            )}
            <dt className="text-muted">IP address</dt>
            <dd className="font-mono text-ink">{event.ip ?? "Not recorded"}</dd>
            <dt className="text-muted">Device</dt>
            <dd className="text-ink">
              {ua.label}
              {event.userAgent && (
                <span className="mt-0.5 block break-all font-mono text-[11px] text-muted">
                  {event.userAgent}
                </span>
              )}
            </dd>
            {entries.map((entry) => (
              <div key={entry.key} className="contents">
                <dt className="text-muted">{entry.label}</dt>
                <dd className="break-words text-ink">{entry.value}</dd>
              </div>
            ))}
            <dt className="text-muted">Event</dt>
            <dd className="break-all font-mono text-[11px] text-muted">
              {event.action} · {event.id}
            </dd>
          </dl>
        </div>
      </details>
    </li>
  );
}
