"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserProfile {
  email: string;
  name: string | null;
  totpEnabled: boolean;
  providers: {
    github: boolean;
    google: boolean;
  };
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const linkError =
    searchParams.get("error") === "provider_in_use"
      ? "That provider is already linked to another account."
      : null;

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.json())
      .then((data) => setProfile(data.user ?? null));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-zinc-600">Manage your account and integrations</p>

      {linkError && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {linkError}
        </p>
      )}

      <div className="mt-8 max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-zinc-500">Email:</span>{" "}
              {profile?.email ?? "—"}
            </p>
            <p>
              <span className="text-zinc-500">Name:</span>{" "}
              {profile?.name ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>GitHub</span>
              {profile?.providers.github ? (
                <Badge status="active" />
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    signIn("github", { callbackUrl: "/dashboard/settings" })
                  }
                >
                  Connect GitHub
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Google</span>
              {profile?.providers.google ? (
                <Badge status="active" />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    signIn("google", { callbackUrl: "/dashboard/settings" })
                  }
                >
                  Connect Google
                </Button>
              )}
            </div>
            {!profile?.providers.github && (
              <p className="text-sm text-amber-700">
                Connect GitHub to deploy repositories from your account.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge status={profile?.totpEnabled ? "active" : "pending"} />
              <span className="text-sm text-zinc-600">
                {profile?.totpEnabled
                  ? "Required on every login. Use Google Authenticator or Authy."
                  : "Not enrolled yet"}
              </span>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Lost access to your authenticator? Contact support@yourdomain.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
