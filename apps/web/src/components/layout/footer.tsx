import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="site-wrap flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BrandLogo />
          <p className="mt-2 max-w-sm text-sm text-muted">
            Managed Docker hosting for indie developers. Best-effort hosting, not
            for mission-critical production.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <Link href="/docs" className="hover:text-ink">
            Docs
          </Link>
          <Link href="/docs/getting-started" className="hover:text-ink">
            Guide
          </Link>
          <Link href="/docs/roadmap" className="hover:text-ink">
            Roadmap
          </Link>
          <Link href="/status" className="hover:text-ink">
            Status
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/cookies" className="hover:text-ink">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
