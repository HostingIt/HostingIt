"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-zinc-600">Manage your account and integrations</p>

      <Card className="mt-8 max-w-xl">
        <CardHeader>
          <CardTitle>GitHub connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600">
            Connect GitHub to deploy from your repositories. If you signed up
            with email, link GitHub to access repos.
          </p>
          <Button
            className="mt-4"
            onClick={async () => {
              const { signIn } = await import("next-auth/react");
              await signIn("github", { callbackUrl: "/dashboard/settings" });
            }}
          >
            Connect GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
