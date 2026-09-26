"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  readCookieConsent,
  writeCookieConsent,
  type ConsentChoice,
} from "@/lib/cookie-consent";

function subscribeToCookie() {
  return () => {};
}

export function CookieConsentBanner() {
  const [dismissed, setDismissed] = useState(false);
  const decided = useSyncExternalStore(
    subscribeToCookie,
    () => readCookieConsent() !== null,
    () => true
  );

  if (decided || dismissed) return null;

  function decide(choice: ConsentChoice) {
    writeCookieConsent(choice);
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface"
    >
      <div className="site-wrap flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Cookies keep you signed in and protect your account with two-step
          verification. We run no advertising or analytics cookies. Details in
          the{" "}
          <Link href="/cookies" className="text-ink underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => decide("essential")}
          >
            Essential only
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => decide("all")}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
