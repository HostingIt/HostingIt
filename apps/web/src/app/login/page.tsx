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
      : params.error === "email_unverified"
        ? "Verify your email address with your provider, then sign in again."
        : params.error
        ? "Sign in failed. Please try again."
        : null;

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Sign in to HostingIt
          </CardTitle>
          <CardDescription>
            Sign in to HostingIt with GitHub or Google
          </CardDescription>
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
