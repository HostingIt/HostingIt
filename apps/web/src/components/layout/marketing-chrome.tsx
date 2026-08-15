"use client";

import { usePathname } from "next/navigation";
import { HomeShell } from "@/components/home/home-shell";

export function MarketingChrome({
  loggedIn,
  children,
}: {
  loggedIn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAppShell =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isAppShell) {
    return <>{children}</>;
  }

  return <HomeShell loggedIn={loggedIn}>{children}</HomeShell>;
}
