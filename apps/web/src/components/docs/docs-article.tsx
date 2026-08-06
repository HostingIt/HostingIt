import type { ReactNode } from "react";

export function DocsArticle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <article>
      <header className="border-b border-border pb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </header>
      <div className="docs-prose mt-10">{children}</div>
    </article>
  );
}
