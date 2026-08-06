export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-zinc-500">Last updated: August 2026</p>

      <div className="prose prose-zinc dark:prose-invert mt-12 max-w-none">
        <h2>Information we collect</h2>
        <ul>
          <li>Account information: email, name</li>
          <li>OAuth provider IDs (GitHub, Google)</li>
          <li>TOTP 2FA secret (encrypted at rest)</li>
          <li>GitHub access tokens (to list and deploy your repositories)</li>
          <li>Payment reference notes for manual billing verification</li>
          <li>Application metadata: repo names, deployment logs</li>
        </ul>

        <h2>How we use your information</h2>
        <p>
          We use your information to provide the hosting service, authenticate
          your account, deploy your applications, and process billing requests.
        </p>

        <h2>Third parties</h2>
        <p>
          We use our own deploy infrastructure for hosting, GitHub and Google for
          authentication, and encrypted TOTP for two-factor authentication. We
          do not sell your data.
        </p>

        <h2>Data retention</h2>
        <p>
          Account data is retained while your account is active. You may request
          deletion by contacting support@yourdomain.com.
        </p>

        <h2>Contact</h2>
        <p>For privacy questions, contact support@yourdomain.com.</p>
      </div>
    </div>
  );
}
