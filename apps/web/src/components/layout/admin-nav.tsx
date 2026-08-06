import Link from "next/link";
import { requireAdmin } from "@/lib/session";

const adminItems = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/apps", label: "Apps" },
];

export async function AdminNav() {
  await requireAdmin();

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="border-b border-border px-4 py-4">
        <Link
          href="/admin/users"
          className="font-display text-lg font-bold tracking-tight text-ink"
        >
          Admin
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {adminItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-background hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/dashboard"
          className="mt-auto rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-background hover:text-ink"
        >
          ← Back to Dashboard
        </Link>
      </nav>
    </aside>
  );
}
