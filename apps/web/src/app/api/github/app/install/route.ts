import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getGithubAppInstallUrl,
  isGithubAppConfigured,
} from "@/lib/github-app";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  if (!isGithubAppConfigured()) {
    return NextResponse.json(
      {
        error:
          "GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_APP_SLUG.",
      },
      { status: 503 }
    );
  }

  return NextResponse.redirect(getGithubAppInstallUrl(session.user.id));
}
