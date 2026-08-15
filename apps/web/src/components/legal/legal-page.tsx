import type { ReactNode } from "react";

export function LegalPage({
  label,
  title,
  updated,
  children,
}: {
  label: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div>
      <section className="hero-plane relative overflow-hidden border-b border-border">
        <div className="hero-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="site-wrap relative py-16 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-accent">
            {label}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-muted">Last updated: {updated}</p>
        </div>
      </section>

      <div className="site-wrap py-14 sm:py-16">
        <div className="docs-prose">{children}</div>
      </div>
    </div>
  );
}
