import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsBlocks } from "@/components/docs/docs-blocks";
import { getAppHostname } from "@/lib/dokploy";
import { getDocsNeighbors, getDocsPage } from "@/lib/docs/document";

export function DocsPageView({ slug }: { slug: string }) {
  const page = getDocsPage(slug);
  if (!page) notFound();

  const host = getAppHostname("my-api-a1b2c3d4e5f6");
  const { prev, next } = getDocsNeighbors(slug);

  return (
    <article className="docs-article">
      <header className="docs-article-head">
        <p className="docs-kicker">Docs</p>
        <h1 className="docs-title">{page.title}</h1>
        <p className="docs-lede">{page.description}</p>
      </header>
      <div className="docs-prose">
        <DocsBlocks blocks={page.blocks} host={host} />
      </div>
      <nav className="docs-pager" aria-label="Nearby pages">
        {prev ? (
          <Link href={prev.href} className="docs-pager-link">
            <span>Previous</span>
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={next.href} className="docs-pager-link is-next">
            <span>Next</span>
            {next.title}
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
