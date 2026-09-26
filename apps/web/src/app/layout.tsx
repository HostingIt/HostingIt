import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { MarketingChrome } from "@/components/layout/marketing-chrome";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { getSession } from "@/lib/session";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "HostingIt",
  title: {
    default: "HostingIt",
    template: "%s",
  },
  description:
    "The purpose of HostingIt is to provide managed Docker hosting for indie developers. Deploy Docker apps from GitHub in minutes. Best-effort hosting for hobby projects and small applications.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://hostingit.online"
  ),
  openGraph: {
    siteName: "HostingIt",
    title: "HostingIt",
    description:
      "The purpose of HostingIt is to provide managed Docker hosting for indie developers. Deploy Docker apps from GitHub in minutes. Best-effort hosting for hobby projects and small applications.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "HostingIt" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <MarketingChrome loggedIn={!!session?.user}>{children}</MarketingChrome>
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
