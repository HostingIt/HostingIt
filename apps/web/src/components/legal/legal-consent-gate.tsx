"use client";

import { LegalConsentDialog } from "@/components/legal/legal-consent-dialog";

/**
 * Blocking acceptance popup for signed-in accounts whose user row has no
 * recorded acceptance. The dashboard layout renders this only when
 * terms_accepted_at is null, and a successful accept triggers a refresh.
 */
export function LegalConsentGate() {
  return (
    <LegalConsentDialog
      open
      onOpenChange={() => {}}
      mode="dashboard"
      dismissible={false}
    />
  );
}
