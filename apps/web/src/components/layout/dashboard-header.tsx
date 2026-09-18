"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, CreditCard, LogOut, Menu, Plus, Settings, Shield, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";
import { SidebarNav } from "@/components/layout/dashboard-sidebar";

function UserMenu() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const name = session?.user?.name ?? null;
  const email = session?.user?.email ?? null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="dash-account"
          aria-label="Account menu"
        >
          <Avatar name={name} email={email} className="h-7 w-7" />
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[12rem] rounded-[14px] border border-border bg-surface p-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">
              {name ?? "Account"}
            </p>
            {email ? (
              <p className="truncate text-xs text-muted">{email}</p>
            ) : null}
          </div>
          {isAdmin && (
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/users"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
              >
                <Shield className="h-4 w-4 text-muted" aria-hidden />
                Admin
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/billing"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
            >
              <CreditCard className="h-4 w-4 text-muted" aria-hidden />
              Billing
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/settings"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
            >
              <Settings className="h-4 w-4 text-muted" aria-hidden />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none hover:bg-surface-2"
            onSelect={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4 text-muted" aria-hidden />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function DashboardHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="dash-header">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="dash-menu-btn"
                aria-label="Open navigation"
              >
                <Menu className="h-4.5 w-4.5" aria-hidden />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" />
              <Dialog.Content
                aria-label="Dashboard navigation"
                className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface lg:hidden"
              >
                <div className="flex h-16 items-center border-b border-border px-4">
                  <BrandLogo href="/dashboard" />
                </div>
                <SidebarNav onNavigate={() => setOpen(false)} />
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                    aria-label="Close navigation"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <Link
            href="/dashboard"
            className="font-display text-lg font-bold tracking-tight text-ink lg:hidden"
          >
            HostingIt
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/apps/new" className="home-dash">
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            <span>New App</span>
          </Link>
          <ThemeToggle className="home-theme-toggle" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
