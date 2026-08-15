"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface OAuthButtonsProps {
  callbackUrl?: string;
}

export function OAuthButtons({ callbackUrl = "/dashboard" }: OAuthButtonsProps) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => signIn("github", { callbackUrl })}
      >
        Continue with GitHub
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        Continue with Google
      </Button>
      <p className="pt-2 text-center text-xs text-muted">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
