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
      <div className="home dash">
        <DashboardTopNav />
        <div className="dash-body">
          <div className="site-wrap dash-page">{children}</div>
        </div>
      </div>
    </Providers>
  );
}
