import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";

export default function AppsDocsPage() {
  return (
    <DocsArticle
      title="Apps & limits"
      description="How HostingIt counts apps, and how that maps to frontend / backend repos."
    >
      <h2>What counts as an app</h2>
      <p>
        In HostingIt, an <strong>app</strong> is one deployable unit: one root
        directory, one build, one running container, and one public URL.
      </p>
      <p>
        Your product might be “one app” in your head (for example a full product
        with UI and API). On HostingIt, that still maps to{" "}
        <strong>one HostingIt app per container</strong>.
      </p>

      <h2>Plan limits</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Apps</th>
            <th>Resources</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>1</td>
            <td>256 MB RAM · 0.25 vCPU</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>Up to 5</td>
            <td>512 MB RAM · 0.5 vCPU each</td>
          </tr>
        </tbody>
      </table>
      <p>
        See <Link href="/pricing">pricing</Link> for the full comparison.
      </p>

      <h2>Monorepos (frontend + backend)</h2>
      <p>
        Repos like <code>frontend/</code> + <code>backend/</code> with separate
        Dockerfiles are common. HostingIt can detect both folders when you create
        an app.
      </p>
      <ul>
        <li>
          <strong>Free</strong> — deploy one of them (usually the API or the
          full-stack package you care about most). Host the other elsewhere, or
          combine into a single Dockerfile.
        </li>
        <li>
          <strong>Pro</strong> — create two HostingIt apps from the same repo
          (different root directories), then wire them with environment
          variables (for example the frontend&apos;s{" "}
          <code>API_URL</code> pointing at the backend URL).
        </li>
      </ul>

      <div className="callout">
        <p>
          HostingIt does not run a full <code>docker-compose</code> stack as one
          free-tier app. Compose files may help detection, but each service you
          want online is still its own HostingIt app.
        </p>
      </div>

      <h2>Supported stacks</h2>
      <ul>
        <li>Anything with a Dockerfile (recommended)</li>
        <li>Node.js, Python, Go, Rust, Ruby via Nixpacks when no Dockerfile</li>
        <li>Static sites</li>
      </ul>
    </DocsArticle>
  );
}
