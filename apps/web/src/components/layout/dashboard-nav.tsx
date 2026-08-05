import Link from "next/link";
import { requireAuth } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Apps" },
  { href: "/dashboard/apps/new", label: "New App" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

export async function DashboardNav() {
  await requireAuth();

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-4">
      <Link href="/dashboard" className="mb-6 block text-lg font-bold">
        HostingIt
      </Link>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="mt-8"
      >
        <Button variant="outline" size="sm" type="submit" className="w-full">
          Sign out
        </Button>
      </form>
    </aside>
  );
}
