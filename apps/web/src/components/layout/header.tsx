import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-zinc-900">
          HostingIt
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-zinc-600 hover:text-zinc-900">
            Pricing
          </Link>
          <Link href="/docs" className="text-sm text-zinc-600 hover:text-zinc-900">
            Docs
          </Link>
          {session?.user ? (
            <>
              {session.user.role === "admin" && (
                <Link href="/admin/users" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Admin
                </Link>
              )}
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
                Login
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
