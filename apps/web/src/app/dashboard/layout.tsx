import { eq, count } from "drizzle-orm";
import { Providers } from "@/components/providers";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { LegalConsentGate } from "@/components/legal/legal-consent-gate";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { apps, users } from "@/db/schema";
import { getEffectiveAppLimit } from "@/lib/plans";
import { resolveAvatarSrc } from "@/lib/avatar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  const [[user], [{ value: appCount }]] = await Promise.all([
    db
      .select({
        email: users.email,
        name: users.name,
        role: users.role,
        plan: users.plan,
        avatarUpdatedAt: users.avatarUpdatedAt,
        termsAcceptedAt: users.termsAcceptedAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    db
      .select({ value: count() })
      .from(apps)
      .where(eq(apps.userId, session.user.id)),
  ]);

  const appLimit = user
    ? getEffectiveAppLimit({
        role: user.role,
        email: user.email,
        plan: user.plan,
      })
    : 1;
  const avatarSrc = user
    ? resolveAvatarSrc({
        email: user.email,
        avatarUpdatedAt: user.avatarUpdatedAt,
      })
    : null;

  return (
    <Providers>
      <div className="home dash">
        <DashboardSidebar />
        <div className="dash-main">
          <DashboardHeader
            appCount={appCount}
            appLimit={appLimit}
            avatarSrc={avatarSrc}
            name={user?.name ?? session.user.name ?? null}
            email={user?.email ?? session.user.email ?? null}
          />
          <div className="dash-body">
            <div className="site-wrap dash-page">{children}</div>
          </div>
        </div>
      </div>
      {!user?.termsAcceptedAt && <LegalConsentGate />}
    </Providers>
  );
}
