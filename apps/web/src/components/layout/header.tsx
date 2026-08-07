import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { getSession } from "@/lib/session";

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <BrandLogo priority />
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
              <Button size="sm">Dashboard</Button>
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
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
