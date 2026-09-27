import Link from "next/link";
import { HomeNav } from "@/components/home/home-nav";

export function HomeShell({
  loggedIn,
  children,
}: {
  loggedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="home">
      <HomeNav loggedIn={loggedIn} />

      <main className="home-main">{children}</main>

      <footer className="home-footer">
        <div className="home-wrap home-footer-inner">
          <p className="home-footer-copy">© 2026 HostingIt</p>
          <nav className="home-footer-links" aria-label="Footer">
            <Link href="/docs">Docs</Link>
            <Link href="/about">About</Link>
            <Link href="/status">Status</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookies">Cookies</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
