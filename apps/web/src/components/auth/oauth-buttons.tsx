"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  LegalConsentDialog,
  type ConsentProvider,
} from "@/components/legal/legal-consent-dialog";

interface OAuthButtonsProps {
  callbackUrl?: string;
  /** Signup asks for terms acceptance first; login does not. */
  requireConsent?: boolean;
}

export function OAuthButtons({
  callbackUrl = "/dashboard",
  requireConsent = false,
}: OAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] =
    useState<ConsentProvider | null>(null);

  function start(provider: ConsentProvider) {
    if (requireConsent) {
      setPendingProvider(provider);
      return;
    }
    signIn(provider, { callbackUrl });
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => start("github")}
      >
        Continue with GitHub
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => start("google")}
      >
        Continue with Google
      </Button>
      <p className="pt-2 text-center text-xs text-muted">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
        ,{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/cookies" className="underline">
          Cookie Policy
        </Link>
        .
      </p>

      {requireConsent && (
        <LegalConsentDialog
          open={pendingProvider !== null}
          onOpenChange={(open) => {
            if (!open) setPendingProvider(null);
          }}
          mode="signup"
          provider={pendingProvider ?? "github"}
          callbackUrl={callbackUrl}
        />
      )}
    </div>
  );
}
