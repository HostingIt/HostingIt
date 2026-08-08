import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";

export default function DeploysDocsPage() {
  return (
    <DocsArticle
      title="Builds & deploys"
      description="Root directory, build types, Dockerfiles, and how redeploys work."
    >
      <h2>Root directory</h2>
      <p>
        The root directory is the folder HostingIt builds from. For a single-app
        repo, leave it as <code>/</code>. For monorepos, set it to the service
        folder: for example <code>/backend</code> or <code>/frontend</code>.
      </p>
      <p>
        Change it anytime under the app&apos;s <strong>Settings</strong> tab,
        then save and redeploy.
      </p>

      <h2>Build types</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>When to use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Dockerfile</td>
            <td>You have a Dockerfile (or variant). Preferred when detected.</td>
          </tr>
          <tr>
            <td>Nixpacks</td>
            <td>No Dockerfile; auto-detect from package managers / language files.</td>
          </tr>
          <tr>
            <td>Static</td>
            <td>Plain HTML/CSS/JS sites.</td>
          </tr>
          <tr>
            <td>Railpack</td>
            <td>Manual override when you specifically need that builder.</td>
          </tr>
        </tbody>
      </table>

      <h2>Dockerfile paths &amp; stages</h2>
      <p>
        When you choose Dockerfile, HostingIt can detect common layouts:
      </p>
      <ul>
        <li>
          <code>Dockerfile</code>, <code>Dockerfile.prod</code>,{" "}
          <code>Containerfile</code>
        </li>
        <li>
          Nested paths like <code>docker/Dockerfile</code>
        </li>
        <li>
          Multi-stage names such as <code>runner</code> or{" "}
          <code>production</code>
        </li>
      </ul>
      <p>
        You can override Dockerfile path, Docker context, and build stage in
        Settings (or Advanced options when creating an app).
      </p>

      <h2>Live logs</h2>
      <p>
        The Logs tab streams runtime output over a live connection (SSE). Leave{" "}
        <strong>Live</strong> on to follow new lines; pause anytime, or copy /
        download the buffer.
      </p>

      <h2>Redeploy &amp; auto-deploy</h2>
      <ul>
        <li>
          <strong>Redeploy</strong> rebuilds from the connected branch with
          current settings.
        </li>
        <li>
          With auto-deploy enabled, pushes to that branch trigger a new deploy
          (via the HostingIt GitHub App).
        </li>
      </ul>

      <h2>When a build fails</h2>
      <p>
        Open the Deployments tab and read the build log. Common fixes:
      </p>
      <ul>
        <li>Wrong root directory for a monorepo</li>
        <li>Dockerfile path does not match the repo</li>
        <li>Missing env vars or build secrets</li>
      </ul>
      <p>
        Use <strong>Scan repo again</strong> on a failed deploy for alternate
        folders HostingIt found. More detail in{" "}
        <Link href="/docs/apps">Apps &amp; limits</Link>.
      </p>
    </DocsArticle>
  );
}
