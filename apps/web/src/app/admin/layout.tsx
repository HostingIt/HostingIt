import { Providers } from "@/components/providers";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { LegalConsentGate } from "@/components/legal/legal-consent-gate";
import { getUserById } from "@/lib/oauth-user";
import { requireAdmin } from "@/lib/session";
import { resolveAvatarSrc } from "@/lib/avatar";
import { isUnlimitedHosting } from "@/lib/plans";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const user = await getUserById(session.user.id);
  const avatarSrc = user
    ? resolveAvatarSrc({ email: user.email, avatarUpdatedAt: user.avatarUpdatedAt })
    : null;

  return (
    <Providers>
      <div className="home dash">
        <AdminSidebar />
        <div className="dash-main">
          <AdminHeader
            name={user?.name ?? session.user.name ?? null}
            email={user?.email ?? session.user.email ?? null}
            avatarSrc={avatarSrc}
            superAdmin={user ? isUnlimitedHosting(user) : false}
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
