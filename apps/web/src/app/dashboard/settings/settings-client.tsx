"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";

export interface UserProfile {
  email: string;
  name: string | null;
  totpEnabled: boolean;
  githubAppInstalled: boolean;
  githubAppConfigureUrl: string | null;
  githubAppReady: boolean;
  providers: {
    github: boolean;
    google: boolean;
  };
}

interface SettingsClientProps {
  profile: UserProfile;
  linkError: string | null;
  flash: string | null;
}

export function SettingsClient({
  profile,
  linkError,
  flash,
}: SettingsClientProps) {
  async function connectProvider(provider: "github" | "google") {
    const { signIn } = await import("next-auth/react");
    await signIn(provider, { callbackUrl: "/dashboard/settings" });
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Settings"
        description="Manage your account and integrations"
      />

      {linkError && <Alert className="mt-6">{linkError}</Alert>}
      {flash && <Alert variant="success" className="mt-6">{flash}</Alert>}

      <div className="mt-8 max-w-xl space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted">Email:</span>{" "}
              <span className="text-ink">{profile.email}</span>
            </p>
            <p>
              <span className="text-muted">Name:</span>{" "}
              <span className="text-ink">{profile.name ?? "—"}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              GitHub App (deploys)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">
              Install the HostingIt GitHub App and grant the repos you want to
              deploy. This is separate from signing in with GitHub.
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink">Installation</span>
              {profile.githubAppInstalled ? (
                <Badge status="active" />
              ) : (
                <Badge status="pending" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.githubAppReady ? (
                <>
                  <Button asChild size="sm">
                    <a href="/api/github/app/install">
                      {profile.githubAppInstalled
                        ? "Reinstall / change account"
                        : "Install GitHub App"}
                    </a>
                  </Button>
                  {profile.githubAppConfigureUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={profile.githubAppConfigureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Configure repos
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <Alert variant="warning">
                  GitHub App is not configured on the server yet.
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Connected login providers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-ink">GitHub</span>
              {profile.providers.github ? (
                <Badge status="active" />
              ) : (
                <Button size="sm" onClick={() => connectProvider("github")}>
                  Connect GitHub
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink">Google</span>
              {profile.providers.google ? (
                <Badge status="active" />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => connectProvider("google")}
                >
                  Connect Google
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Two-factor authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge status={profile.totpEnabled ? "active" : "pending"} />
              <span className="text-sm text-muted">
                {profile.totpEnabled
                  ? "Required on every login. Use Google Authenticator or Authy."
                  : "Not enrolled yet"}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              Lost access to your authenticator? Contact support@hostingit.online.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
