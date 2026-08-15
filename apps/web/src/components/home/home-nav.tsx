"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
  { href: "/status", label: "Status" },
] as const;

export function HomeNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="home-nav">
      <div className="home-wrap home-nav-inner">
        <BrandLogo priority />
        <nav className="home-nav-links" aria-label="Marketing">
          {NAV.map((item) => {
            const active =
              item.href === "/docs"
                ? pathname.startsWith("/docs")
                : pathname === item.href;
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
          <ThemeToggle className="home-theme-toggle" />
          <Link
            href={loggedIn ? "/dashboard" : "/signup"}
            className="home-dash"
          >
            <span className="home-dash-full">
              {loggedIn ? "Dashboard" : "Get started"}
            </span>
            <span className="home-dash-short">
              {loggedIn ? "Open" : "Start"}
            </span>
          </Link>
          <button
            type="button"
            className="home-menu-btn"
            aria-expanded={open}
            aria-controls="home-mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <nav
          id="home-mobile-nav"
          className="home-mobile-nav"
          aria-label="Mobile"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="home-mobile-link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
