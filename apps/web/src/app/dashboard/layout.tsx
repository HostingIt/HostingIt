import { Providers } from "@/components/providers";
import { DashboardTopNav } from "@/components/layout/dashboard-top-nav";
import { requireAuth } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <Providers>
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <DashboardTopNav />
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-6xl pb-10">{children}</div>
        </div>
      </div>
    </Providers>
  );
}
