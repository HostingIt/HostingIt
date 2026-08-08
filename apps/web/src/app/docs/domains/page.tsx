import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { getAppHostname } from "@/lib/dokploy";

export default function DomainsDocsPage() {
  const exampleHost = getAppHostname("my-api");

  return (
    <DocsArticle
      title="Domains"
      description="Free HostingIt subdomains and custom domains on Pro."
    >
      <h2>Free subdomain</h2>
      <p>
        Every app gets an HTTPS subdomain on HostingIt, for example{" "}
        <code>{exampleHost}</code>. No DNS setup required.
      </p>

      <h2>Custom domains (Pro)</h2>
      <p>
        On Pro and above you can attach your own domain from the app detail
        page.
      </p>
      <ol>
        <li>Add the domain in the HostingIt dashboard.</li>
        <li>
          Create a <strong>CNAME</strong> (or the record we show) pointing at
          your app&apos;s HostingIt hostname.
        </li>
        <li>Wait for DNS to propagate: SSL is issued automatically.</li>
      </ol>
      <p>
        Free plan stays on the shared subdomain. Upgrade anytime from{" "}
        <Link href="/pricing">Pricing</Link> or Billing.
      </p>
    </DocsArticle>
  );
}
