import { BrandLogo } from "@/components/brand-logo";

export function PreviewChrome({
  active = "apps",
  children,
}: {
  active?: "dashboard" | "apps" | "metrics";
  children: React.ReactNode;
}) {
  return (
    <div className="home-preview" aria-hidden>
      <div className="home-preview-nav">
        <div className="home-preview-nav-left">
          <BrandLogo href={null} size="sm" />
          <span
            className={
              active === "dashboard"
                ? "home-preview-nav-link is-active"
                : "home-preview-nav-link"
            }
          >
            Dashboard
          </span>
          <span
            className={
              active === "apps"
                ? "home-preview-nav-link is-active"
                : "home-preview-nav-link"
            }
          >
            Apps
          </span>
          <span
            className={
              active === "metrics"
                ? "home-preview-nav-link is-active"
                : "home-preview-nav-link"
            }
          >
            Metrics
          </span>
        </div>
        <div className="home-preview-nav-right">
          <span className="home-preview-cta">New App</span>
          <span className="home-preview-icon" />
          <span className="home-preview-account">Account</span>
        </div>
      </div>
      {children}
    </div>
  );
}
