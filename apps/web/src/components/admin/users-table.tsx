"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Ban,
  CircleCheck,
  Crown,
  ExternalLink,
  KeyRound,
  Search,
  ShieldOff,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectDropdown } from "@/components/ui/select-dropdown";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  accountStatus: string;
  role: string;
  providers: string[];
  githubAppInstalled: boolean;
  totpEnabled: boolean;
  joined: string;
  joinedAgo: string;
  lastLogin: { ago: string; device: string; ip: string | null } | null;
  appCount: number;
  apps: Array<{ id: string; name: string; status: string; url: string }>;
  isSuperAdmin: boolean;
  isSelf: boolean;
}

const PLAN_FILTERS = [
  { value: "all", label: "All plans" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const STATUS_FILTERS = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
];

const TWOFA_FILTERS = [
  { value: "all", label: "Any 2FA" },
  { value: "on", label: "2FA enabled" },
  { value: "off", label: "No 2FA" },
];

function TwoFactorPill({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
      <KeyRound className="h-3.5 w-3.5" aria-hidden />
      On
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
      <ShieldOff className="h-3.5 w-3.5" aria-hidden />
      Off
    </span>
  );
}

export function UsersTable({
  users,
  initialUserId,
}: {
  users: AdminUserRow[];
  initialUserId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [twofa, setTwofa] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialUserId && users.some((u) => u.id === initialUserId) ? initialUserId : null
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.email.toLowerCase().includes(q) && !(u.name ?? "").toLowerCase().includes(q)) {
        return false;
      }
      if (plan !== "all" && u.plan !== plan) return false;
      if (status !== "all" && u.accountStatus !== status) return false;
      if (twofa === "on" && !u.totpEnabled) return false;
      if (twofa === "off" && u.totpEnabled) return false;
      return true;
    });
  }, [users, query, plan, status, twofa]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  function openUser(id: string | null) {
    setSelectedId(id);
    router.replace(id ? `${pathname}?user=${id}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search users</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name…"
            className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus-visible:border-accent"
          />
        </label>
        <div className="grid grid-cols-3 gap-2 lg:flex lg:w-auto">
          <div className="lg:w-36">
            <SelectDropdown size="sm" fullWidth label="Plan" value={plan} options={PLAN_FILTERS} onChange={setPlan} />
          </div>
          <div className="lg:w-36">
            <SelectDropdown size="sm" fullWidth label="Status" value={status} options={STATUS_FILTERS} onChange={setStatus} />
          </div>
          <div className="lg:w-36">
            <SelectDropdown size="sm" fullWidth label="2FA" value={twofa} options={TWOFA_FILTERS} onChange={setTwofa} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted">
        Showing {filtered.length} of {users.length} users
      </p>

      <Card className="card-elevated overflow-hidden border-border">
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">No users match these filters.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="nice-scroll hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">2FA</th>
                    <th className="px-3 py-3 font-medium">Apps</th>
                    <th className="px-3 py-3 font-medium">Last sign-in</th>
                    <th className="px-4 py-3 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openUser(u.id)}
                      className="cursor-pointer transition-colors hover:bg-surface-2/60"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openUser(u.id);
                          }}
                          className="flex items-center gap-3 text-left"
                        >
                          <Avatar name={u.name} email={u.email} className="h-8 w-8" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-medium text-ink">
                              <span className="truncate">{u.name ?? u.email.split("@")[0]}</span>
                              {u.isSuperAdmin && (
                                <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Super admin" />
                              )}
                              {u.isSelf && <span className="text-[11px] font-normal text-muted">(you)</span>}
                            </span>
                            <span className="block truncate text-xs text-muted">{u.email}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3"><Badge status={u.plan} /></td>
                      <td className="px-3 py-3"><Badge status={u.accountStatus} /></td>
                      <td className="px-3 py-3"><TwoFactorPill enabled={u.totpEnabled} /></td>
                      <td className="px-3 py-3 font-mono text-xs text-ink">{u.appCount}</td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {u.lastLogin ? (
                          <>
                            <span className="text-ink">{u.lastLogin.ago}</span>
                            <span className="block truncate">{u.lastLogin.device}</span>
                          </>
                        ) : (
                          "Never"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted" title={u.joined}>
                        {u.joinedAgo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => openUser(u.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60"
                  >
                    <Avatar name={u.name} email={u.email} className="h-9 w-9" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        <span className="truncate">{u.name ?? u.email.split("@")[0]}</span>
                        {u.isSuperAdmin && <Crown className="h-3.5 w-3.5 text-amber-500" aria-hidden />}
                      </span>
                      <span className="block truncate text-xs text-muted">{u.email}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge status={u.plan} />
                        <Badge status={u.accountStatus} />
                        <TwoFactorPill enabled={u.totpEnabled} />
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted">
                      {u.appCount} app{u.appCount === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) openUser(null);
        }}
        title="User details"
        description="Account security, apps, plan, and access"
        variant="drawer"
      >
        {selected && <UserDetail key={selected.id} user={selected} />}
      </Modal>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

const PLAN_OPTIONS = [
  { value: "free", label: "Free", hint: "Public plan" },
  { value: "pro", label: "Pro", hint: "Upcoming; assign manually" },
  { value: "enterprise", label: "Enterprise", hint: "Custom" },
];

function UserDetail({ user }: { user: AdminUserRow }) {
  const router = useRouter();
  const [plan, setPlan] = useState(user.plan);
  const [confirm, setConfirm] = useState<null | "plan" | "suspend" | "activate">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canSuspend = !user.isSelf && !user.isSuperAdmin;

  async function update(body: { plan?: string; accountStatus?: string }) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      if (body.plan) {
        const l = data.limits as
          | { reloaded: number; saved: number; failed: number }
          | null
          | undefined;
        setMessage(
          l
            ? `Plan updated. Limits: ${l.reloaded} restarted · ${l.saved} saved${l.failed ? ` · ${l.failed} failed` : ""}.`
            : "Plan updated."
        );
      } else {
        setMessage(body.accountStatus === "suspended" ? "Account suspended." : "Account activated.");
      }
      setConfirm(null);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nice-scroll flex-1 space-y-6 overflow-y-auto px-5 py-5">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} email={user.email} className="h-12 w-12 text-sm" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <span className="truncate">{user.name ?? user.email.split("@")[0]}</span>
            {user.isSuperAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                <Crown className="h-3 w-3" aria-hidden />
                Super admin
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted">
            {user.email} · {user.role}
          </p>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <dl className="grid grid-cols-2 gap-3">
        <Fact label="Plan"><Badge status={user.plan} /></Fact>
        <Fact label="Status"><Badge status={user.accountStatus} /></Fact>
        <Fact label="Two-factor"><TwoFactorPill enabled={user.totpEnabled} /></Fact>
        <Fact label="Providers">{user.providers.join(" + ") || "None"}</Fact>
        <Fact label="GitHub App">{user.githubAppInstalled ? "Installed" : "Not installed"}</Fact>
        <Fact label="Joined">
          {user.joined}
          <span className="block text-xs text-muted">{user.joinedAgo}</span>
        </Fact>
        <div className="col-span-2">
          <Fact label="Last sign-in">
            {user.lastLogin ? (
              <>
                {user.lastLogin.ago} · {user.lastLogin.device}
                {user.lastLogin.ip && (
                  <span className="font-mono text-xs text-muted"> · {user.lastLogin.ip}</span>
                )}
              </>
            ) : (
              "No sign-ins recorded"
            )}
          </Fact>
        </div>
      </dl>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Apps ({user.apps.length})</h3>
          <Link
            href={`/admin/audit?user=${user.id}`}
            className="text-xs text-accent hover:underline"
          >
            View activity →
          </Link>
        </div>
        {user.apps.length === 0 ? (
          <p className="text-sm text-muted">No apps.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {user.apps.map((app) => (
              <li key={app.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/admin/apps?q=${encodeURIComponent(app.name)}`}
                    className="block truncate text-sm font-medium text-ink hover:underline"
                  >
                    {app.name}
                  </Link>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 font-mono text-[11px] text-accent hover:underline"
                  >
                    <span className="truncate">{app.url.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  </a>
                </div>
                <Badge status={app.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-ink">Plan</h3>
        <p className="text-xs text-muted">
          Changing the plan pushes the new CPU/RAM limits to this user&apos;s apps and
          restarts running containers.
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <SelectDropdown size="sm" fullWidth label="Plan" value={plan} options={PLAN_OPTIONS} onChange={setPlan} />
          </div>
          <Button
            size="sm"
            variant="accent"
            disabled={busy || plan === user.plan}
            onClick={() => setConfirm("plan")}
          >
            Apply
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-red-500/30 p-4">
        <h3 className="text-sm font-semibold text-ink">Access</h3>
        {user.accountStatus === "suspended" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm("activate")}>
            <CircleCheck className="h-4 w-4" aria-hidden />
            Activate account
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !canSuspend}
              onClick={() => setConfirm("suspend")}
            >
              <Ban className="h-4 w-4" aria-hidden />
              Suspend account
            </Button>
            {!canSuspend && (
              <p className="text-xs text-muted">
                {user.isSelf
                  ? "You can't suspend your own account."
                  : "The super admin account can't be suspended."}
              </p>
            )}
          </>
        )}
        {user.accountStatus === "pending" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm("activate")}>
            Activate account
          </Button>
        )}
      </section>

      <ConfirmModal
        open={confirm === "plan"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Move ${user.email} to ${plan}?`}
        description="Their apps get the new plan limits. Running containers restart (no rebuild) to apply them."
        confirmLabel="Change plan"
        variant="accent"
        busy={busy}
        onConfirm={() => update({ plan })}
      />
      <ConfirmModal
        open={confirm === "suspend"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Suspend ${user.email}?`}
        description="Their API access is blocked right away and panel access ends when their session refreshes. Their apps keep running; stop them from Instances if needed."
        confirmLabel="Suspend"
        busy={busy}
        onConfirm={() => update({ accountStatus: "suspended" })}
      />
      <ConfirmModal
        open={confirm === "activate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Activate ${user.email}?`}
        description="They can sign in and manage their apps again."
        confirmLabel="Activate"
        variant="accent"
        busy={busy}
        onConfirm={() => update({ accountStatus: "active" })}
      />
    </div>
  );
}
