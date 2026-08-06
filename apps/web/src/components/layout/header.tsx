import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-ink"
        >
          Hosting<span className="text-accent">It</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          <Link
            href="/pricing"
            className="px-2 py-1 text-sm text-muted transition-colors hover:text-ink"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="hidden px-2 py-1 text-sm text-muted transition-colors hover:text-ink sm:inline"
          >
            Docs
          </Link>
          <ThemeToggle />
          {session?.user ? (
            <Link href="/dashboard">
              <Button size="sm" className="bg-ink hover:bg-ink/90">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-2 py-1 text-sm text-muted transition-colors hover:text-ink"
              >
                Login
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-ink hover:bg-ink/90">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
