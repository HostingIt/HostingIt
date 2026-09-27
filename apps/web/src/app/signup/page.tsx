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
    <div className="auth-page">
      <Card className="auth-card">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Create a HostingIt account
          </CardTitle>
          <CardDescription>
            HostingIt free tier includes 1 app. You&apos;ll set up 2FA on first
            login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthButtons callbackUrl="/dashboard" requireConsent />
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
