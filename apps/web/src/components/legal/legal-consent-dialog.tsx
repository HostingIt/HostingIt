"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConsentProvider = "github" | "google";

const PROVIDER_LABEL: Record<ConsentProvider, string> = {
  github: "GitHub",
  google: "Google",
};

const SUMMARY = [
  "HostingIt builds and runs Docker apps from a GitHub repository you pick. The free plan runs one app with 512 MB of memory and 1 vCPU on a subdomain with HTTPS.",
  "Hosting is best-effort. We publish no uptime guarantee, so keep anything critical somewhere else.",
  "You keep ownership of your code. We read only the repositories you grant through the GitHub App, and we use them to build and serve your apps.",
  "Crypto mining, spam, malware, and anything illegal are not allowed.",
  "Automatic backups are not running yet. Keep your own copy of anything you cannot afford to lose.",
  "Paid plans are not open yet. When they open, payments are manual and monthly, and you cancel by emailing support.",
  "We store your account details, your encrypted 2FA secret, and metadata about your apps. We never sell your data.",
];

interface LegalConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "signup" | "dashboard";
  provider?: ConsentProvider;
  callbackUrl?: string;
  dismissible?: boolean;
}

export function LegalConsentDialog({
  open,
  onOpenChange,
  mode,
  provider = "github",
  callbackUrl = "/dashboard",
  dismissible = true,
}: LegalConsentDialogProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAgreed(false);
      setSubmitting(false);
      setError(null);
    }
    onOpenChange(next);
  }

  const actionLabel =
    mode === "signup"
      ? `Agree and continue with ${PROVIDER_LABEL[provider]}`
      : "Agree and continue";

  async function handleAgree() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/legal/accept", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Consent request failed with ${response.status}`);
      }

      if (mode === "dashboard") {
        handleOpenChange(false);
        router.refresh();
        return;
      }

      await signIn(provider, { callbackUrl });
    } catch {
      setError(
        "We could not record your acceptance. Check your connection and try again, or email support if it keeps failing."
      );
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={dismissible ? handleOpenChange : undefined}
    >
      <DialogContent
        onEscapeKeyDown={dismissible ? undefined : (event) => event.preventDefault()}
        onPointerDownOutside={
          dismissible ? undefined : (event) => event.preventDefault()
        }
        onInteractOutside={
          dismissible ? undefined : (event) => event.preventDefault()
        }
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "signup"
              ? "Before you create your account"
              : "Accept the terms to continue"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signup"
              ? "The short version of what you are signing up for:"
              : "Your account has no recorded acceptance of the Terms of Service and Privacy Policy. Agree to keep using the dashboard."}
          </DialogDescription>
        </DialogHeader>

        {mode === "signup" && (
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1 text-sm text-muted">
            {SUMMARY.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="text-accent">
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm text-muted">
          Full documents:{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline"
          >
            Terms of Service
          </Link>
          ,{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/cookies"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline"
          >
            Cookie Policy
          </Link>
          .
        </p>

        <label className="mt-5 flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span>
            I have read and agree to the Terms of Service and the Privacy
            Policy.
          </span>
        </label>

        {error && (
          <Alert className="mt-4" variant="error">
            {error}
          </Alert>
        )}

        <DialogFooter>
          {dismissible && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="accent"
            onClick={handleAgree}
            disabled={!agreed || submitting}
          >
            {submitting ? "Recording..." : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
