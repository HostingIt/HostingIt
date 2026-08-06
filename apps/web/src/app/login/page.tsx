import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Alert } from "@/components/ui/alert";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage =
    params.error === "suspended"
      ? "Your account has been suspended. Contact support."
      : params.error
        ? "Sign in failed. Please try again."
        : null;

  return (
    <div className="hero-plane relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="hero-grid absolute inset-0 opacity-50" aria-hidden />
      <Card className="relative w-full max-w-md border-border bg-surface/95 shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in with GitHub or Google</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert className="mb-4">{errorMessage}</Alert>
          )}
          <OAuthButtons callbackUrl="/dashboard" />
          <p className="mt-6 text-center text-sm text-muted">
            New here?{" "}
            <Link href="/signup" className="font-medium text-ink hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
