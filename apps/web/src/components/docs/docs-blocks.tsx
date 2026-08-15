import Link from "next/link";
import type { ReactNode } from "react";
import type { DocsBlock } from "@/lib/docs/document";

function renderInline(raw: string, host: string): ReactNode[] {
  const text = raw.replaceAll("{{host}}", host);
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (link) {
        const href = link[2];
        const label = link[1];
        nodes.push(
          href.startsWith("/") ? (
            <Link key={key} href={href}>
              {label}
            </Link>
          ) : (
            <a key={key} href={href} rel="noreferrer">
              {label}
            </a>
          )
        );
      }
    }
    key += 1;
    last = match.index + token.length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes;
}

export function DocsBlocks({
  blocks,
  host,
}: {
  blocks: DocsBlock[];
  host: string;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return <h2 key={index}>{block.text}</h2>;
          case "p":
            return <p key={index}>{renderInline(block.text, host)}</p>;
          case "ul":
            return (
              <ul key={index}>
                {block.items.map((item) => (
                  <li key={item}>{renderInline(item, host)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index}>
                {block.items.map((item) => (
                  <li key={item}>{renderInline(item, host)}</li>
                ))}
              </ol>
            );
          case "table":
            return (
              <table key={index}>
                <thead>
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.join("-")}>
                      {row.map((cell) => (
                        <td key={cell}>{renderInline(cell, host)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case "callout":
            return (
              <div key={index} className="callout">
                <p>{renderInline(block.text, host)}</p>
              </div>
            );
        }
      })}
    </>
  );
}
