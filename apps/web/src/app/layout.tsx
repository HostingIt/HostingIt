import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MarketingChrome } from "@/components/layout/marketing-chrome";
import { ThemeProvider } from "@/components/theme-provider";

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
  title: "HostingIt — Docker hosting for developers",
  description:
    "Deploy Docker apps from GitHub in minutes. Best-effort hosting for hobby projects and small applications.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://hostingit.online"
  ),
  openGraph: {
    title: "HostingIt — Docker hosting for developers",
    description:
      "Deploy Docker apps from GitHub in minutes. Best-effort hosting for hobby projects and small applications.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "HostingIt" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <MarketingChrome header={<Header />} footer={<Footer />}>
            {children}
          </MarketingChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
