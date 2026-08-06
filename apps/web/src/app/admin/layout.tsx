import { AdminNav } from "@/components/layout/admin-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AdminNav />
      <div className="min-w-0 flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
