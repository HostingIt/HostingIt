import { DocsNav } from "@/components/docs/docs-nav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="docs">
      <div className="docs-wrap">
        <aside className="docs-side">
          <DocsNav />
        </aside>
        <div className="docs-main">{children}</div>
      </div>
    </div>
  );
}
