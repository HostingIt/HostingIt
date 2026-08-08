"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/otp-input";
import { Alert } from "@/components/ui/alert";

export default function Setup2FAPage() {
  const { data: session, status, update } = useSession();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    // Wait for session; do not bounce to /login during brief auth flickers.
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    if (session.user.mfaEnrolled && session.user.mfaVerified) {
      window.location.href = "/dashboard";
      return;
    }

    if (session.user.mfaEnrolled && !session.user.mfaVerified) {
      window.location.href = "/login/2fa";
      return;
    }

    const userId = session.user.id;
    if (loadedForUserRef.current === userId && qrDataUrl) {
      setFetching(false);
      return;
    }

    let cancelled = false;

    async function loadEnrollment() {
      setFetching(true);
      setError("");

      try {
        const res = await fetch("/api/auth/2fa/enroll");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to start 2FA setup");
        }

        if (data.alreadyEnrolled) {
          await update();
          if (!cancelled) window.location.href = "/login/2fa";
          return;
        }

        if (!cancelled) {
          loadedForUserRef.current = userId;
          setQrDataUrl(data.qrDataUrl);
          setManualKey(data.manualKey ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load QR code"
          );
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    }

    void loadEnrollment();

    return () => {
      cancelled = true;
    };
    // Intentionally omit `update` / full session — unstable refs caused cancel loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, session?.user?.mfaEnrolled, session?.user?.mfaVerified, status]);

  // Hard fallback if session never becomes authenticated (e.g. expired cookie).
  useEffect(() => {
    if (status !== "unauthenticated") return;
    const t = setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
    return () => clearTimeout(t);
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/2fa/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "Invalid code");
      return;
    }

    if (typeof data.mfaProof === "string") {
      await update({ mfaProof: data.mfaProof });
    } else {
      await update();
    }

    window.location.href = "/dashboard";
  }

  async function copyManualKey() {
    if (!manualKey) return;
    await navigator.clipboard.writeText(manualKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="hero-plane relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="hero-grid absolute inset-0 opacity-50" aria-hidden />

      <div className="relative w-full max-w-md animate-fade-up border border-border bg-surface/95 p-6 sm:p-8">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-accent">
          Security
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Set up two-factor auth
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Required for every HostingIt account. Scan with Google Authenticator,
          Authy, or any TOTP app, then enter the code to continue.
        </p>

        <ol className="mt-6 flex gap-2 font-mono text-[10px] uppercase tracking-wider text-muted">
          <li className="rounded-sm bg-accent/15 px-2 py-1 text-accent">1 · Scan</li>
          <li className="rounded-sm bg-background px-2 py-1">2 · Verify</li>
          <li className="rounded-sm bg-background px-2 py-1">3 · Done</li>
        </ol>

        {status === "loading" || fetching ? (
          <div className="mt-8 space-y-4">
            <div className="skeleton mx-auto h-48 w-48 rounded-md" />
            <div className="skeleton skeleton-text mx-auto h-4 w-40" />
            <div className="skeleton h-14 w-full rounded-md" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && <Alert>{error}</Alert>}

            {qrDataUrl && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-md border border-border bg-surface p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="2FA QR code"
                    className="h-44 w-44"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowManual((v) => !v)}
                  className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                >
                  {showManual ? "Hide manual entry key" : "Can't scan? Enter key manually"}
                </button>
                {showManual && manualKey && (
                  <div className="w-full border border-border bg-background p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Manual key
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-ink">
                      {manualKey}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={copyManualKey}
                    >
                      {copied ? "Copied" : "Copy key"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="code" className="text-ink">
                6-digit code
              </Label>
              <OtpInput
                value={code}
                onChange={setCode}
                disabled={loading}
                autoFocus={!fetching}
              />
            </div>

            <Button
              type="submit"
              variant="accent" className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? "Verifying..." : "Enable 2FA and continue"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
