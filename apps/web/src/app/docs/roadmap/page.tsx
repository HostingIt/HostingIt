import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";

export default function RoadmapPage() {
  return (
    <DocsArticle
      title="Roadmap"
      description="Where HostingIt is headed — Infra capacity and multi-node scaling."
    >
      <h2>How you run on HostingIt</h2>
      <table>
        <thead>
          <tr>
            <th>Surface</th>
            <th>For</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>HostingIt Cloud</td>
            <td>Indie devs, hobby projects, first apps</td>
            <td>Available now</td>
          </tr>
          <tr>
            <td>HostingIt Infra</td>
            <td>Paid plans on team-scaled infrastructure</td>
            <td>Coming soon</td>
          </tr>
        </tbody>
      </table>
      <p>
        You always use the same HostingIt panel. Provisioning stays behind the
        scenes — you deploy apps, we run the infrastructure.
      </p>

      <h2>HostingIt Infra</h2>
      <p>
        Team-operated capacity so paid customers get better isolation and room
        to grow beyond free-tier limits.
      </p>
      <ul>
        <li>Dedicated nodes for Pro and Enterprise</li>
        <li>Multi-region capacity as we expand</li>
        <li>Routing, SSL, and monitoring managed by HostingIt</li>
      </ul>

      <h2>Multi-node scaling</h2>
      <ol>
        <li>
          <strong>Multi-node Infra</strong> — several hosts; scheduler picks by
          plan and load
        </li>
        <li>
          <strong>Central routing</strong> — one domain front door; each app
          mapped to its host
        </li>
        <li>
          <strong>Regions</strong> — EU, US, APAC where it makes sense
        </li>
      </ol>

      <h2>Also planned</h2>
      <ul>
        <li>Richer project grouping for multi-container products</li>
        <li>Automated billing</li>
        <li>Uptime monitoring and backups</li>
        <li>Team / organization accounts</li>
      </ul>

      <h2>What stays the same</h2>
      <ul>
        <li>Sign in with GitHub or Google + mandatory 2FA</li>
        <li>Connect repo → get a URL → manage in one place</li>
        <li>Honest best-effort limits for hobby vs production workloads</li>
      </ul>

      <p>
        Timelines are approximate. Questions about Infra early access? Reach out
        from your dashboard, or return to the{" "}
        <Link href="/docs">docs overview</Link>.
      </p>
    </DocsArticle>
  );
}
