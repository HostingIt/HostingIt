"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ConnectGithubPromptProps {
  appConfigured: boolean;
}

export function ConnectGithubPrompt({ appConfigured }: ConnectGithubPromptProps) {
  return (
    <div className="animate-fade-up">
      <Card className="border-dashed border-border bg-surface/50">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Install GitHub App
          </CardTitle>
          <CardDescription>
            HostingIt needs permission to clone the repositories you choose,
            same model as Railway or Vercel. Install the GitHub App, then pick
            which repos to grant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {appConfigured ? (
            <Button asChild>
              <a href="/api/github/app/install">Install GitHub App</a>
            </Button>
          ) : (
            <Alert variant="warning">
              GitHub App env vars are not configured on this server yet. Ask the
              operator to set <code className="font-mono">GITHUB_APP_*</code>.
            </Alert>
          )}
          <p className="text-sm text-muted">
            Already installed?{" "}
            <Link href="/dashboard/settings" className="text-accent hover:underline">
              Check Settings
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
