"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Server,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const ADMIN_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/apps", label: "Instances", icon: Server },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/payments", label: "Payments", icon: ReceiptText },
];

function isActive(pathname: string, item: AdminNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4"
      aria-label="Admin sections"
    >
      <div className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-widest text-muted">
          Super admin
        </p>
        {ADMIN_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn("dash-side-link", active && "is-active")}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="dash-sidebar hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
        <BrandLogo href="/admin" />
      </div>
      <AdminNavLinks />
      <div className="shrink-0 border-t border-border px-3 py-3">
        <Link href="/dashboard" className="dash-side-link">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Link>
      </div>
    </aside>
  );
}
