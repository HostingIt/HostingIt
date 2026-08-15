"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, CreditCard, LogOut, Settings, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/apps", label: "Apps" },
  { href: "/dashboard/metrics", label: "Metrics", exact: true },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/dashboard/apps") {
    return (
      pathname === "/dashboard/apps" ||
      (pathname.startsWith("/dashboard/apps/") &&
        !pathname.startsWith("/dashboard/apps/new"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function UserMenu() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="dash-account">
          Account
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[10rem] rounded-[14px] border border-border bg-surface p-1"
        >
          {isAdmin && (
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/users"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
              >
                <Shield className="h-4 w-4 text-muted" />
                Admin
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/billing"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
            >
              <CreditCard className="h-4 w-4 text-muted" />
              Billing
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/settings"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
            >
              <Settings className="h-4 w-4 text-muted" />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
            onSelect={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4 text-muted" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function DashboardTopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="home-nav">
      <div className="home-wrap home-nav-inner">
        <BrandLogo href="/dashboard" />
        <nav className="home-nav-links" aria-label="Dashboard">
          {mainNav.map((item) => {
            const active = isActive(
              pathname,
              item.href,
              "exact" in item && item.exact
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("home-nav-link", active && "is-active")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="home-nav-actions">
          <Link href="/dashboard/apps/new" className="home-dash dash-new">
            <span className="home-dash-full">New App</span>
            <span className="home-dash-short">New</span>
          </Link>
          <ThemeToggle className="home-theme-toggle" />
          <UserMenu />
          <button
            type="button"
            className="home-menu-btn"
            aria-expanded={open}
            aria-controls="dash-mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="dash-mobile-nav" className="home-mobile-nav" aria-label="Mobile">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="home-mobile-link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard/apps/new"
            className="home-mobile-link"
            onClick={() => setOpen(false)}
          >
            New App
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
