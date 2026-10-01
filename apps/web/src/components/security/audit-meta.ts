import {
  Boxes,
  CircleStop,
  CreditCard,
  Cpu,
  Fingerprint,
  Globe,
  KeyRound,
  Link2,
  LogIn,
  LogOut,
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
  UserCog,
  Variable,
  type LucideIcon,
} from "lucide-react";

export type ActionTone = "default" | "danger" | "admin";

export interface ActionMeta {
  label: string;
  icon: LucideIcon;
  tone: ActionTone;
}

const ACTION_META: Record<string, Omit<ActionMeta, "tone"> & { tone?: ActionTone }> = {
  "auth.login": { label: "Signed in", icon: LogIn },
  "auth.logout": { label: "Signed out", icon: LogOut },
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
  "account.delete": { label: "Account deleted", icon: Trash2, tone: "danger" },
  "github.install": { label: "GitHub App installed", icon: Boxes },
  "github.uninstall": { label: "GitHub App removed", icon: Boxes, tone: "danger" },
  "admin.user_plan_change": {
    label: "Plan changed by administrator",
    icon: UserCog,
    tone: "admin",
  },
  "admin.user_status_change": {
    label: "Account status changed by administrator",
    icon: UserCog,
    tone: "admin",
  },
  "admin.payment_review": {
    label: "Payment reviewed by administrator",
    icon: CreditCard,
    tone: "admin",
  },
  "admin.app_stop": {
    label: "App stopped by administrator",
    icon: Square,
    tone: "admin",
  },
  "admin.app_limits_enforce": {
    label: "Resource limits applied",
    icon: Cpu,
    tone: "admin",
  },
  "admin.limits_enforce_all": {
    label: "Limits enforced on all apps",
    icon: ShieldCheck,
    tone: "admin",
  },
};

export function metaFor(action: string): ActionMeta {
  const meta = ACTION_META[action];
  if (!meta) return { label: action, icon: Fingerprint, tone: "default" };
  return { ...meta, tone: meta.tone ?? "default" };
}

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  google: "Google",
};

function providerLabel(value: string): string {
  return PROVIDER_LABELS[value.toLowerCase()] ?? value;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function joinKeys(value: unknown, max = 3): string | null {
  if (!Array.isArray(value)) return null;
  const keys = value.filter((k): k is string => typeof k === "string" && !!k);
  if (keys.length === 0) return null;
  const shown = keys.slice(0, max).join(", ");
  return keys.length > max ? `${shown} +${keys.length - max} more` : shown;
}

/** One-line human summary of an event's metadata. */
export function describeMetadata(metadata: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const provider = str(metadata.provider);
  if (provider) parts.push(`via ${providerLabel(provider)}`);

  const repo = str(metadata.repo);
  const branch = str(metadata.branch);
  if (repo) parts.push(branch ? `${repo}@${branch}` : repo);
  else if (branch) parts.push(`branch ${branch}`);

  const domain = str(metadata.domain);
  if (domain) parts.push(domain);

  const from = str(metadata.from);
  const to = str(metadata.to);
  if (from && to) parts.push(`${from} → ${to}`);
  else if (to) parts.push(`→ ${to}`);

  const plan = str(metadata.plan);
  if (plan && !to) {
    const method = str(metadata.method);
    parts.push(method ? `${plan} via ${method}` : plan);
  }

  const envKeys = joinKeys(metadata.envKeys);
  if (envKeys) parts.push(envKeys);
  if (metadata.buildSecretsChanged === true) parts.push("build secrets");
  if (metadata.buildArgsChanged === true) parts.push("build args");

  const fields = joinKeys(metadata.fields);
  if (fields && !envKeys) parts.push(`changed ${fields}`);

  if (typeof metadata.reloaded === "number" || typeof metadata.saved === "number") {
    parts.push(
      `${Number(metadata.reloaded ?? 0)} restarted · ${Number(metadata.saved ?? 0)} saved · ${Number(metadata.failed ?? 0)} failed`
    );
  }

  const reason = str(metadata.reason);
  if (reason) parts.push(reason);

  return parts.length > 0 ? parts.join(" · ") : null;
}

const KEY_LABELS: Record<string, string> = {
  provider: "Provider",
  repo: "Repository",
  branch: "Branch",
  domain: "Domain",
  plan: "Plan",
  method: "Payment method",
  envKeys: "Variables",
  buildSecretsChanged: "Build secrets changed",
  buildArgsChanged: "Build args changed",
  installationId: "GitHub installation",
  name: "App name",
  slug: "Slug",
  buildType: "Build type",
  deployImmediately: "Deploy immediately",
  fields: "Changed fields",
  from: "From",
  to: "To",
  field: "Field",
  by: "By",
  limits: "Limits",
  result: "Result",
  reloaded: "Restarted",
  saved: "Saved",
  failed: "Failed",
  reason: "Reason",
  action: "Action",
  actorId: "Administrator ID",
};

function humanizeKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  const spaced = key.replace(/[_.-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function humanizeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map((v) => humanizeValue(v)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Readable key/value pairs for the expanded event details. */
export function metadataEntries(
  metadata: Record<string, unknown> | null | undefined
): Array<{ key: string; label: string; value: string }> {
  if (!metadata) return [];
  return Object.entries(metadata)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      value:
        key === "provider" && typeof value === "string"
          ? providerLabel(value)
          : humanizeValue(value),
    }));
}

export function timeAgo(date: Date, now = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (sec < 60) return "just now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** "Today", "Yesterday", or a date heading for grouping events by day. */
export function dayLabel(date: Date, now = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/** Request-time clock for server components (each render is one request). */
export function requestNow(): number {
  return Date.now();
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
