import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { getAppHostname } from "@/lib/dokploy";

export default function DocsPage() {
  const exampleHost = getAppHostname("my-api");

  return (
    <DocsArticle
      title="Documentation"
      description="Deploy from GitHub, get a live URL with SSL, and manage your apps from one dashboard."
    >
      <h2>What HostingIt is</h2>
      <p>
        HostingIt is managed Docker hosting for indie developers. Connect a
        GitHub repository, pick what to deploy, and we give you a subdomain with
        SSL: flat pricing, no cloud console maze.
      </p>
      <p>
        It is best-effort hosting for hobby projects and small apps. It is not a
        replacement for mission-critical production infrastructure.
      </p>

      <h2>Start here</h2>
      <ul>
        <li>
          <Link href="/docs/getting-started">Getting started</Link>: first
          deploy in a few minutes
        </li>
        <li>
          <Link href="/docs/apps">Apps &amp; limits</Link>: what an app is, Free
          vs Pro, monorepos
        </li>
        <li>
          <Link href="/docs/deploys">Builds &amp; deploys</Link>: Dockerfile,
          Nixpacks, root directory, stages
        </li>
        <li>
          <Link href="/docs/variables">Variables &amp; secrets</Link>: runtime
          env and build secrets
        </li>
        <li>
          <Link href="/docs/domains">Domains</Link>: free subdomain and custom
          domains on Pro
        </li>
      </ul>

      <h2>Example URL</h2>
      <p>
        Free apps get a HostingIt subdomain, for example{" "}
        <code>{exampleHost}</code>.
      </p>

      <div className="callout">
        <p>
          <strong>Tip.</strong> Each HostingIt app runs one deployable unit (one
          root directory / one container). Frontend and backend folders in the
          same repo are two apps: see{" "}
          <Link href="/docs/apps">Apps &amp; limits</Link>.
        </p>
      </div>
    </DocsArticle>
  );
}
