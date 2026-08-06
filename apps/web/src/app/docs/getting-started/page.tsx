import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { getAppHostname } from "@/lib/dokploy";

export default function GettingStartedPage() {
  const exampleHost = getAppHostname("my-api");

  return (
    <DocsArticle
      title="Getting started"
      description="Create an account, connect GitHub, and ship your first app."
    >
      <ol>
        <li>
          <strong>Sign up</strong> with GitHub or Google, then complete mandatory
          2FA.
        </li>
        <li>
          Open <strong>Settings</strong> and install the HostingIt GitHub App.
          Grant access to the repos you want to deploy.
        </li>
        <li>
          Click <strong>New App</strong>. Choose a repository and branch.
        </li>
        <li>
          If HostingIt detects more than one deployable folder (for example{" "}
          <code>frontend/</code> and <code>backend/</code>), pick the one you
          want for this app.
        </li>
        <li>
          Confirm build settings (or leave the detected defaults) and create the
          app.
        </li>
        <li>
          When the deploy finishes, open your live URL — something like{" "}
          <code>{exampleHost}</code>.
        </li>
      </ol>

      <h2>What happens on deploy</h2>
      <ol>
        <li>We clone your GitHub branch.</li>
        <li>We build with Dockerfile, Nixpacks, or static settings you chose.</li>
        <li>We start the container and attach HTTPS on your subdomain.</li>
      </ol>

      <h2>Next steps</h2>
      <ul>
        <li>
          Set <Link href="/docs/variables">environment variables</Link> if your
          app needs them, then redeploy.
        </li>
        <li>
          Tune <Link href="/docs/deploys">root directory and build type</Link>{" "}
          under Settings if the first detection was wrong.
        </li>
        <li>
          On Pro, attach a <Link href="/docs/domains">custom domain</Link>.
        </li>
      </ul>
    </DocsArticle>
  );
}
