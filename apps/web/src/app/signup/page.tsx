import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function SignupPage() {
  return (
    <div className="hero-plane relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="hero-grid absolute inset-0 opacity-50" aria-hidden />
      <Card className="relative w-full max-w-md border-border bg-surface/95 shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Create your account
          </CardTitle>
          <CardDescription>
            Free tier includes 1 app. You&apos;ll set up 2FA on first login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthButtons callbackUrl="/dashboard" />
          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
