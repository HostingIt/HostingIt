import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in with GitHub or Google</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {errorMessage}
            </p>
          )}
          <OAuthButtons callbackUrl="/dashboard" />
          <p className="mt-6 text-center text-sm text-zinc-600">
            New here?{" "}
            <Link href="/signup" className="font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
