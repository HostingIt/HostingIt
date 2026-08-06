"use client";

import { usePathname } from "next/navigation";

/**
 * Marketing chrome (header + footer) for public pages only.
 * Dashboard and admin use their own full-viewport shells.
 */
export function MarketingChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAppShell =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isAppShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  );
}
