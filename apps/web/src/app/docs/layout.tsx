import { DocsNav } from "@/components/docs/docs-nav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
        <aside className="lg:w-52 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <DocsNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
