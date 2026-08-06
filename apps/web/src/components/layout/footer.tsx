import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-ink">
            Hosting<span className="text-accent">It</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Managed Docker hosting for indie developers. Best-effort — not for
            mission-critical production.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/pricing" className="hover:text-ink">
            Pricing
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
        </nav>
      </div>
    </footer>
  );
}
