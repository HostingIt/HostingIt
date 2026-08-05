export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">Documentation</h1>
      <p className="mt-4 text-zinc-600">
        Get your first app deployed in under 5 minutes.
      </p>

      <div className="prose prose-zinc mt-12 max-w-none">
        <h2>Quick start</h2>
        <ol>
          <li>Create an account with GitHub or Google.</li>
          <li>Complete mandatory 2FA setup on first login.</li>
          <li>Connect GitHub from Settings if you signed in with Google.</li>
          <li>Click <strong>New App</strong>, select a repository and branch.</li>
          <li>HostingIt provisions your app and assigns a subdomain with SSL.</li>
          <li>Your app will be available at <code>your-app.yourdomain.com</code>.</li>
        </ol>

        <h2>Supported apps</h2>
        <ul>
          <li>Node.js (Express, Next.js, etc.)</li>
          <li>Python (Flask, FastAPI)</li>
          <li>Static sites</li>
          <li>Any app with a Dockerfile or standard build configuration</li>
        </ul>

        <h2>Custom domains</h2>
        <p>
          Available on Starter plan and above. Add your domain in the app detail
          page, then point a CNAME record to your app subdomain.
        </p>

        <h2>Environment variables</h2>
        <p>
          In-dashboard environment variable management is coming soon. Contact
          support if you need env vars set for your app in the meantime.
        </p>

        <h2>Limitations</h2>
        <p>
          HostingIt provides best-effort hosting for hobby projects and small
          applications. We do not guarantee 99.99% uptime. Do not use this
          platform for mission-critical production workloads.
        </p>
      </div>
    </div>
  );
}
