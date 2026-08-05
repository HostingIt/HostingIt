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
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-4">
      <Link href="/admin/users" className="mb-6 block text-lg font-bold">
        Admin
      </Link>
      <nav className="space-y-1">
        {adminItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/dashboard"
          className="block rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-200"
        >
          ← Back to Dashboard
        </Link>
      </nav>
    </aside>
  );
}
