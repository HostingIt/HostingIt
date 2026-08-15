import { PreviewChrome } from "@/components/home/preview-chrome";

export function DeployPreview() {
  return (
    <PreviewChrome active="apps">
      <div className="home-preview-body home-preview-body-wide">
        <p className="home-preview-title">New App</p>
        <p className="home-preview-sub">
          Deploy a GitHub repository to HostingIt
        </p>

        <div className="home-preview-card">
          <p className="home-preview-card-title">Basics</p>
          <p className="home-preview-copy">
            Name your app and pick a repository.
          </p>

          <label className="home-preview-field">
            <span>App name</span>
            <span className="home-preview-input">my-portfolio</span>
            <em>Used to generate a unique URL under fhusr-*.hostingit.online</em>
          </label>

          <label className="home-preview-field">
            <span>Repository</span>
            <span className="home-preview-input is-select">
              you/my-portfolio
            </span>
            <em>Repos you granted the HostingIt GitHub App access to.</em>
          </label>

          <label className="home-preview-field">
            <span>Branch</span>
            <span className="home-preview-input">main</span>
            <em>Defaults to the repo&apos;s default branch when you pick a repository.</em>
          </label>
        </div>

        <p className="home-preview-advanced">Show advanced options</p>

        <div className="home-preview-actions">
          <span className="home-preview-btn is-accent">Deploy app</span>
          <span className="home-preview-btn is-ghost">Cancel</span>
        </div>
      </div>
    </PreviewChrome>
  );
}
