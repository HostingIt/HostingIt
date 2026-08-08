"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, CreditCard, LogOut, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <Button variant="outline" size="sm" className="gap-1 border-border">
          Account
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[10rem] rounded-md border border-border bg-surface p-1 shadow-lg"
        >
          {isAdmin && (
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/users"
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
              >
                <Shield className="h-4 w-4 text-muted" />
                Admin
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/billing"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
            >
              <CreditCard className="h-4 w-4 text-muted" />
              Billing
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/settings"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
            >
              <Settings className="h-4 w-4 text-muted" />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-8">
        <BrandLogo href="/dashboard" size="sm" className="shrink-0" />

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {mainNav.map((item) => {
            const active = isActive(pathname, item.href, "exact" in item && item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/15 text-ink"
                    : "text-muted hover:bg-background hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard/apps/new" className="hidden sm:block">
            <Button size="sm" variant="accent" className="btn-glow">
              New App
            </Button>
          </Link>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
        {mainNav.map((item) => {
          const active = isActive(pathname, item.href, "exact" in item && item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-accent/15 text-ink"
                  : "text-muted hover:bg-background hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard/apps/new"
          className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-accent"
        >
          + New
        </Link>
      </nav>
    </header>
  );
}
