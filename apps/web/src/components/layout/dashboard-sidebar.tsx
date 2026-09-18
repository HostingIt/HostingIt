"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity,
  Boxes,
  CreditCard,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const baseGroups: NavGroup[] = [
  {
    label: "General",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/apps", label: "Apps", icon: Boxes },
      { href: "/dashboard/metrics", label: "Metrics", icon: Activity, exact: true },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

const adminGroup: NavGroup = {
  label: "Administration",
  items: [
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/payments", label: "Payments", icon: ReceiptText },
    { href: "/admin/apps", label: "Apps", icon: Boxes },
  ],
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/dashboard/apps") {
    return (
      pathname === "/dashboard/apps" ||
      (pathname.startsWith("/dashboard/apps/") &&
        !pathname.startsWith("/dashboard/apps/new"))
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const groups = isAdmin ? [...baseGroups, adminGroup] : baseGroups;

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4" aria-label="Dashboard sections">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-widest text-muted">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={`${group.label}-${item.href}`}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "dash-side-link",
                  active && "is-active"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function DashboardSidebar() {
  return (
    <aside className="dash-sidebar hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <BrandLogo href="/dashboard" />
      </div>
      <SidebarNav />
      <div className="shrink-0 border-t border-border px-3 py-3">
        <Link href="/" className="dash-side-link">
          <span aria-hidden>←</span>
          Back to site
        </Link>
      </div>
    </aside>
  );
}
