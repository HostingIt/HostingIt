import { BrandLogo } from "@/components/brand-logo";

function ActivePill() {
  return (
    <span className="home-preview-pill">
      <span className="home-preview-dot" />
      Active
    </span>
  );
}

export function DashboardPreview() {
  return (
    <div className="home-preview" aria-hidden>
      <div className="home-preview-nav">
        <div className="home-preview-nav-left">
          <BrandLogo href={null} size="sm" />
          <span className="home-preview-nav-link is-active">Dashboard</span>
          <span className="home-preview-nav-link">Apps</span>
          <span className="home-preview-nav-link">Metrics</span>
        </div>
        <div className="home-preview-nav-right">
          <span className="home-preview-cta">New App</span>
          <span className="home-preview-icon" />
          <span className="home-preview-account">Account</span>
        </div>
      </div>

      <div className="home-preview-body">
        <p className="home-preview-title">Settings</p>
        <p className="home-preview-sub">Manage your account and integrations</p>

        <div className="home-preview-card">
          <p className="home-preview-card-title">Account</p>
          <p>
            <span className="home-preview-muted">Email:</span> you@studio.dev
          </p>
          <p>
            <span className="home-preview-muted">Name:</span> Alex Rivera
          </p>
        </div>

        <div className="home-preview-card">
          <p className="home-preview-card-title">GitHub App (deploys)</p>
          <p className="home-preview-copy">
            Install the HostingIt GitHub App and grant the repos you want to
            deploy. This is separate from signing in with GitHub.
          </p>
          <div className="home-preview-row">
            <span>Installation</span>
            <ActivePill />
          </div>
          <div className="home-preview-actions">
            <span className="home-preview-btn">Reinstall / change account</span>
            <span className="home-preview-btn is-ghost">Configure repos</span>
          </div>
        </div>

        <div className="home-preview-card">
          <p className="home-preview-card-title">Connected login providers</p>
          <div className="home-preview-row">
            <span>GitHub</span>
            <ActivePill />
          </div>
          <div className="home-preview-row">
            <span>Google</span>
            <ActivePill />
          </div>
        </div>

        <div className="home-preview-card">
          <p className="home-preview-card-title">Two-factor authentication</p>
          <div className="home-preview-row is-start">
            <ActivePill />
            <span className="home-preview-copy">
              Required on every login. Use Google Authenticator or Authy.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
