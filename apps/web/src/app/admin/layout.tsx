import { AdminNav } from "@/components/layout/admin-nav";
import { LegalConsentGate } from "@/components/legal/legal-consent-gate";
import { getUserById } from "@/lib/oauth-user";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const user = await getUserById(session.user.id);

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AdminNav />
      <div className="min-w-0 flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </div>
      {!user?.termsAcceptedAt && <LegalConsentGate />}
    </div>
  );
}
