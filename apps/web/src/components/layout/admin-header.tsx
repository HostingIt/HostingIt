"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Menu, Shield, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { Modal } from "@/components/ui/modal";
import { AdminNavLinks } from "@/components/layout/admin-sidebar";
import { UserMenu } from "@/components/layout/dashboard-header";

export function AdminHeader({
  name,
  email,
  avatarSrc,
  superAdmin,
}: {
  name: string | null;
  email: string | null;
  avatarSrc: string | null;
  superAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="dash-header">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Modal
            open={open}
            onOpenChange={setOpen}
            title="Admin navigation"
            variant="sheet"
            overlayClassName="lg:hidden"
            trigger={
              <button type="button" className="dash-menu-btn" aria-label="Open navigation">
                <Menu className="h-4 w-4" aria-hidden />
              </button>
            }
          >
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
                <BrandLogo href="/admin" />
                <button
                  type="button"
                  className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label="Close navigation"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <AdminNavLinks onNavigate={() => setOpen(false)} />
              <div className="shrink-0 border-t border-border px-3 py-3">
                <Link
                  href="/dashboard"
                  className="dash-side-link"
                  onClick={() => setOpen(false)}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to dashboard
                </Link>
              </div>
            </div>
          </Modal>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {superAdmin ? (
              <Crown className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Shield className="h-3.5 w-3.5" aria-hidden />
            )}
            {superAdmin ? "Super admin" : "Admin"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink sm:inline-flex"
          >
            Exit admin
          </Link>
          <ThemeToggle className="home-theme-toggle" />
          <UserMenu name={name} email={email} avatarSrc={avatarSrc} />
        </div>
      </div>
    </header>
  );
}
