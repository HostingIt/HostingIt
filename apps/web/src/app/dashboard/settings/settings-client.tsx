"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

export interface UserProfile {
  email: string;
  name: string | null;
  avatarSrc: string;
  hasCustomAvatar: boolean;
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
  const router = useRouter();
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteTotp, setDeleteTotp] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);

  async function connectProvider(provider: "github" | "google") {
    const { signIn } = await import("next-auth/react");
    await signIn(provider, { callbackUrl: "/dashboard/settings" });
  }

  const emailConfirmed =
    deleteEmail.trim().toLowerCase() === profile.email.trim().toLowerCase();
  const totpReady = /^\d{6}$/.test(deleteTotp.trim());
  const canDeleteAccount = emailConfirmed && totpReady && !deleting;

  async function handleDeleteAccount() {
    if (!canDeleteAccount) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmEmail: deleteEmail.trim(),
          totpCode: deleteTotp.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setDeleteError(data.error ?? "Failed to delete account");
        setDeleting(false);
        return;
      }

      const { signOut } = await import("next-auth/react");
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("Failed to delete account. Try again.");
      setDeleting(false);
    }
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
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <Avatar
                name={profile.name}
                email={profile.email}
                src={profile.avatarSrc}
                className="h-14 w-14 text-base"
              />
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted">
                  {profile.hasCustomAvatar
                    ? "Custom photo"
                    : "Gravatar (or identicon if you have none)"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Label className="inline-flex cursor-pointer items-center">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={avatarBusy}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        setAvatarBusy(true);
                        setAvatarError("");
                        try {
                          const body = new FormData();
                          body.set("file", file);
                          const res = await fetch("/api/account/avatar", {
                            method: "POST",
                            body,
                          });
                          const data = (await res.json().catch(() => ({}))) as {
                            error?: string;
                          };
                          if (!res.ok) {
                            setAvatarError(data.error ?? "Could not upload photo");
                            return;
                          }
                          router.refresh();
                        } catch {
                          setAvatarError("Could not upload photo");
                        } finally {
                          setAvatarBusy(false);
                        }
                      }}
                    />
                    <span className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
                      {avatarBusy ? "Saving…" : "Upload photo"}
                    </span>
                  </Label>
                  {profile.hasCustomAvatar && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={avatarBusy}
                      onClick={async () => {
                        setAvatarBusy(true);
                        setAvatarError("");
                        try {
                          const res = await fetch("/api/account/avatar", {
                            method: "DELETE",
                          });
                          if (!res.ok) {
                            setAvatarError("Could not remove photo");
                            return;
                          }
                          router.refresh();
                        } catch {
                          setAvatarError("Could not remove photo");
                        } finally {
                          setAvatarBusy(false);
                        }
                      }}
                    >
                      Use Gravatar
                    </Button>
                  )}
                </div>
                {avatarError && (
                  <p className="text-xs text-red-500">{avatarError}</p>
                )}
              </div>
            </div>
            <p>
              <span className="text-muted">Email:</span>{" "}
              <span className="text-ink">{profile.email}</span>
            </p>
            <p>
              <span className="text-muted">Name:</span>{" "}
              <span className="text-ink">{profile.name ?? "N/A"}</span>
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

        <Card className="border-red-200 dark:border-red-500/30">
          <CardHeader>
            <CardTitle className="font-display text-lg text-red-700 dark:text-red-400">
              Delete account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Permanently delete your HostingIt account, all apps, deployment
              history, and billing records. This cannot be undone.
            </p>
            {deleteError && <Alert variant="error">{deleteError}</Alert>}
            <div className="space-y-2">
              <Label htmlFor="delete-email">
                Type your email to confirm ({profile.email})
              </Label>
              <Input
                id="delete-email"
                type="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder={profile.email}
                autoComplete="off"
                disabled={deleting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-totp">Authenticator code</Label>
              <Input
                id="delete-totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={deleteTotp}
                onChange={(e) =>
                  setDeleteTotp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="6-digit code"
                autoComplete="one-time-code"
                disabled={deleting}
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!canDeleteAccount}
            >
              {deleting ? "Deleting account..." : "Delete my account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
