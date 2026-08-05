import Link from "next/link";

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/docs" className="text-sm text-zinc-500 hover:underline">
        ← Documentation
      </Link>
      <h1 className="mt-4 text-4xl font-bold">Roadmap &amp; future plans</h1>
      <p className="mt-4 text-zinc-600">
        Where HostingIt is headed — multi-setup infrastructure, team-managed
        Infra, and self-hosted options.
      </p>

      <div className="prose prose-zinc mt-12 max-w-none">
        <h2>Three ways to run on HostingIt</h2>
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
              <td>
                <strong>HostingIt Cloud</strong>
              </td>
              <td>Indie devs, hobby projects, first apps</td>
              <td>Available now</td>
            </tr>
            <tr>
              <td>
                <strong>HostingIt Infra</strong>
              </td>
              <td>Paid plans on team-scaled infrastructure</td>
              <td>Coming soon</td>
            </tr>
            <tr>
              <td>
                <strong>HostingIt Self-Hosted</strong>
              </td>
              <td>Your own server, our panel</td>
              <td>Planned</td>
            </tr>
          </tbody>
        </table>

        <p>
          You always use the same control panel. We handle provisioning behind
          the scenes — you never manage raw servers or internal tooling.
        </p>

        <h2>HostingIt Infra</h2>
        <p>
          <strong>HostingIt Infra</strong> is our team-operated infrastructure —
          the layer we are scaling so paid customers get reliable capacity,
          better isolation, and room to grow beyond free-tier limits.
        </p>
        <ul>
          <li>Dedicated nodes for Starter, Pro, and Business plans</li>
          <li>Multi-region capacity as we expand</li>
          <li>Automatic routing to the right host for your plan</li>
          <li>Monitoring, SSL, and routing managed by the HostingIt team</li>
        </ul>
        <p>
          Free tier stays on shared resources. Upgrading moves your apps onto
          Infra when available.
        </p>

        <h2>Multi-setup scaling</h2>
        <p>
          We&apos;re evolving from a single deploy node to a network of hosts
          orchestrated by the control plane:
        </p>
        <ol>
          <li>
            <strong>Multi-node Infra</strong> — several team-managed hosts;
            scheduler picks by plan and load
          </li>
          <li>
            <strong>Central routing</strong> — one domain front door; each app
            mapped to its host
          </li>
          <li>
            <strong>Regions</strong> — EU, US, APAC nodes where it makes sense
          </li>
          <li>
            <strong>Self-hosted agents</strong> — optional bring-your-own-server
            tier
          </li>
        </ol>

        <h2>Self-hosted (bring your own server)</h2>
        <p>
          For developers who want HostingIt&apos;s deploy workflow on{" "}
          <strong>their own hardware</strong> — homelab, office server, or a VPS
          they already own.
        </p>
        <ul>
          <li>Install a lightweight HostingIt Agent (Docker required)</li>
          <li>Pair with your account via a one-time code</li>
          <li>Deploy from the same dashboard; apps run on your machine</li>
          <li>Outbound-only agent connection — no exposing SSH to the internet</li>
        </ul>
        <p>
          Best for internal tools, learning, or when you need full control of
          the machine. Public URL options (custom domain or secure tunnel) will
          be documented at launch.
        </p>

        <h2>Also on the roadmap</h2>
        <ul>
          <li>In-dashboard environment variables</li>
          <li>Automated billing</li>
          <li>Uptime monitoring and backups</li>
          <li>Team / organization accounts</li>
        </ul>

        <h2>Stay the same</h2>
        <ul>
          <li>Sign in with GitHub or Google + mandatory 2FA</li>
          <li>Connect repo → get a URL → manage in one place</li>
          <li>Honest best-effort limits for hobby vs production workloads</li>
        </ul>

        <p className="text-sm text-zinc-500">
          Timelines are approximate. Infra scaling is active internal work.
          Interested in Infra early access or Self-Hosted beta? Contact support
          from your dashboard.
        </p>
      </div>
    </div>
  );
}
