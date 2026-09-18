import { Providers } from "@/components/providers";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
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
        <DashboardSidebar />
        <div className="dash-main">
          <DashboardHeader />
          <div className="dash-body">
            <div className="site-wrap dash-page">{children}</div>
          </div>
        </div>
      </div>
    </Providers>
  );
}
