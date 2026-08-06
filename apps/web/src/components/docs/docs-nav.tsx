"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/docs", label: "Overview", exact: true },
  { href: "/docs/getting-started", label: "Getting started" },
  { href: "/docs/apps", label: "Apps & limits" },
  { href: "/docs/deploys", label: "Builds & deploys" },
  { href: "/docs/variables", label: "Variables & secrets" },
  { href: "/docs/domains", label: "Domains" },
  { href: "/docs/roadmap", label: "Roadmap" },
];

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="space-y-1">
      <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-widest text-accent">
        Docs
      </p>
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "block rounded-md bg-ink/[0.04] px-3 py-2 text-sm font-medium text-ink dark:bg-white/[0.06]"
                : "block rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-ink/[0.03] hover:text-ink dark:hover:bg-white/[0.04]"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
