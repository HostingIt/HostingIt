"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV } from "@/lib/docs/document";

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="docs-nav">
      <p className="docs-nav-label">Guide</p>
      <div className="docs-nav-list">
        {DOCS_NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "docs-nav-link is-active" : "docs-nav-link"}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
