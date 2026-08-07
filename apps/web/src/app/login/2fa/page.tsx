"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/otp-input";
import { Alert } from "@/components/ui/alert";

export default function Login2FAPage() {
  const { update } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "Invalid code");
      setCode("");
      return;
    }

    // Bake signed MFA proof into the JWT (cookie alone is unreliable behind proxies)
    if (typeof data.mfaProof === "string") {
      await update({ mfaProof: data.mfaProof });
    } else {
      await update();
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="hero-plane relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="hero-grid absolute inset-0 opacity-50" aria-hidden />

      <div className="relative w-full max-w-md animate-fade-up border border-border bg-surface/95 p-6 sm:p-8">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-accent">
          Verify identity
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Two-factor authentication
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Enter the 6-digit code from your authenticator app to finish signing
          in.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <Alert>{error}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="code" className="text-ink">
              Authentication code
            </Label>
            <OtpInput
              value={code}
              onChange={setCode}
              disabled={loading}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="accent" className="w-full"
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verifying..." : "Verify and continue"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Lost your authenticator?{" "}
          <button
            type="button"
            className="font-medium text-ink underline-offset-2 hover:underline"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
