import { DocsArticle } from "@/components/docs/docs-article";

export default function VariablesDocsPage() {
  return (
    <DocsArticle
      title="Variables & secrets"
      description="Runtime environment variables and build-only secrets."
    >
      <h2>Environment variables</h2>
      <p>
        Set runtime variables from your app&apos;s <strong>Variables</strong>{" "}
        tab. Use these for API keys, database URLs, feature flags, and anything
        your process reads at runtime.
      </p>
      <ul>
        <li>
          Mark sensitive values as <strong>Secret</strong> so they stay masked in
          the dashboard.
        </li>
        <li>
          After saving, <strong>redeploy</strong> so the new values are applied.
        </li>
      </ul>

      <h2>Build secrets</h2>
      <p>
        Build secrets are available only during the image build (for example
        private npm registry tokens). They are not baked into the running
        container as ordinary env unless you copy them yourself in the
        Dockerfile.
      </p>

      <h2>On create</h2>
      <p>
        When creating an app, open advanced options to set variables before the
        first deploy. If you are not ready yet, uncheck{" "}
        <strong>Deploy immediately</strong>, configure variables on the app page,
        then redeploy.
      </p>

      <div className="callout">
        <p>
          <strong>Frontend + backend tip.</strong> Put the backend public URL in
          the frontend app&apos;s env (for example{" "}
          <code>NEXT_PUBLIC_API_URL</code>), and configure CORS on the backend
          for the frontend origin.
        </p>
      </div>
    </DocsArticle>
  );
}
