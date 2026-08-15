export type DocsBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; text: string };

export type DocsPage = {
  slug: string;
  href: string;
  title: string;
  description: string;
  blocks: DocsBlock[];
};

export const DOCS_NAV: { href: string; label: string; slug: string; exact?: boolean }[] =
  [
    { href: "/docs", label: "Overview", slug: "overview", exact: true },
    { href: "/docs/getting-started", label: "Getting started", slug: "getting-started" },
    { href: "/docs/apps", label: "Apps & limits", slug: "apps" },
    { href: "/docs/deploys", label: "Builds & deploys", slug: "deploys" },
    { href: "/docs/variables", label: "Variables & secrets", slug: "variables" },
    { href: "/docs/domains", label: "Domains", slug: "domains" },
    { href: "/docs/roadmap", label: "Roadmap", slug: "roadmap" },
  ];

export const DOCUMENT: DocsPage[] = [
  {
    slug: "overview",
    href: "/docs",
    title: "Documentation",
    description:
      "Deploy from GitHub, get a live URL with SSL, and manage your apps from one dashboard.",
    blocks: [
      {
        type: "h2",
        text: "What HostingIt is",
      },
      {
        type: "p",
        text: "HostingIt is managed Docker hosting for indie developers. Connect a GitHub repository, pick what to deploy, and we give you a subdomain with SSL: flat pricing, no cloud console maze.",
      },
      {
        type: "p",
        text: "It is best-effort hosting for hobby projects and small apps. It is not a replacement for mission-critical production infrastructure.",
      },
      { type: "h2", text: "Start here" },
      {
        type: "ul",
        items: [
          "[Getting started](/docs/getting-started): first deploy in a few minutes",
          "[Apps & limits](/docs/apps): what an app is, Free vs Pro, monorepos",
          "[Builds & deploys](/docs/deploys): Dockerfile, Nixpacks, root directory, stages",
          "[Variables & secrets](/docs/variables): runtime env and build secrets",
          "[Domains](/docs/domains): free subdomain and custom domains on Pro",
        ],
      },
      { type: "h2", text: "Example URL" },
      {
        type: "p",
        text: "Free apps get a HostingIt subdomain, for example `{{host}}`.",
      },
      {
        type: "callout",
        text: "**Tip.** Each HostingIt app runs one deployable unit (one root directory / one container). Frontend and backend folders in the same repo are two apps: see [Apps & limits](/docs/apps).",
      },
    ],
  },
  {
    slug: "getting-started",
    href: "/docs/getting-started",
    title: "Getting started",
    description: "Create an account, connect GitHub, and ship your first app.",
    blocks: [
      {
        type: "ol",
        items: [
          "**Sign up** with GitHub or Google, then complete mandatory 2FA.",
          "Open **Settings** and install the HostingIt GitHub App. Grant access to the repos you want to deploy.",
          "Click **New App**. Choose a repository and branch.",
          "If HostingIt detects more than one deployable folder (for example `frontend/` and `backend/`), pick the one you want for this app.",
          "Confirm build settings (or leave the detected defaults) and create the app.",
          "When the deploy finishes, open your live URL: something like `{{host}}`.",
        ],
      },
      { type: "h2", text: "What happens on deploy" },
      {
        type: "ol",
        items: [
          "We clone your GitHub branch.",
          "We build with Dockerfile, Nixpacks, or static settings you chose.",
          "We start the container and attach HTTPS on your subdomain.",
        ],
      },
      { type: "h2", text: "Next steps" },
      {
        type: "ul",
        items: [
          "Set [environment variables](/docs/variables) if your app needs them, then redeploy.",
          "Tune [root directory and build type](/docs/deploys) under Settings if the first detection was wrong.",
          "On Pro, attach a [custom domain](/docs/domains).",
        ],
      },
    ],
  },
  {
    slug: "apps",
    href: "/docs/apps",
    title: "Apps & limits",
    description:
      "How HostingIt counts apps, and how that maps to frontend / backend repos.",
    blocks: [
      { type: "h2", text: "What counts as an app" },
      {
        type: "p",
        text: "In HostingIt, an **app** is one deployable unit: one root directory, one build, one running container, and one public URL.",
      },
      {
        type: "p",
        text: "Your product might be “one app” in your head (for example a full product with UI and API). On HostingIt, that still maps to **one HostingIt app per container**.",
      },
      { type: "h2", text: "Plan limits" },
      {
        type: "table",
        headers: ["Plan", "Apps", "Resources"],
        rows: [
          ["Free", "1", "256 MB RAM · 0.25 vCPU"],
          ["Pro", "Up to 5", "512 MB RAM · 0.5 vCPU each"],
        ],
      },
      {
        type: "p",
        text: "See [Apps & limits](/docs/apps) for the numbers, or [billing](/dashboard/billing) if you are signed in.",
      },
      { type: "h2", text: "Monorepos (frontend + backend)" },
      {
        type: "p",
        text: "Repos like `frontend/` + `backend/` with separate Dockerfiles are common. HostingIt can detect both folders when you create an app.",
      },
      {
        type: "ul",
        items: [
          "**Free**: deploy one of them (usually the API or the full-stack package you care about most). Host the other elsewhere, or combine into a single Dockerfile.",
          "**Pro**: create two HostingIt apps from the same repo (different root directories), then wire them with environment variables (for example the frontend's `API_URL` pointing at the backend URL).",
        ],
      },
      {
        type: "callout",
        text: "HostingIt does not run a full `docker-compose` stack as one free-tier app. Compose files may help detection, but each service you want online is still its own HostingIt app.",
      },
      { type: "h2", text: "Supported stacks" },
      {
        type: "ul",
        items: [
          "Anything with a Dockerfile (recommended)",
          "Node.js, Python, Go, Rust, Ruby via Nixpacks when no Dockerfile",
          "Static sites",
        ],
      },
    ],
  },
  {
    slug: "deploys",
    href: "/docs/deploys",
    title: "Builds & deploys",
    description:
      "Root directory, build types, Dockerfiles, and how redeploys work.",
    blocks: [
      { type: "h2", text: "Root directory" },
      {
        type: "p",
        text: "The root directory is the folder HostingIt builds from. For a single-app repo, leave it as `/`. For monorepos, set it to the service folder: for example `/backend` or `/frontend`.",
      },
      {
        type: "p",
        text: "Change it anytime under the app's **Settings** tab, then save and redeploy.",
      },
      { type: "h2", text: "Build types" },
      {
        type: "table",
        headers: ["Type", "When to use"],
        rows: [
          ["Dockerfile", "You have a Dockerfile (or variant). Preferred when detected."],
          [
            "Nixpacks",
            "No Dockerfile; auto-detect from package managers / language files.",
          ],
          ["Static", "Plain HTML/CSS/JS sites."],
          ["Railpack", "Manual override when you specifically need that builder."],
        ],
      },
      { type: "h2", text: "Dockerfile paths & stages" },
      {
        type: "p",
        text: "When you choose Dockerfile, HostingIt can detect common layouts:",
      },
      {
        type: "ul",
        items: [
          "`Dockerfile`, `Dockerfile.prod`, `Containerfile`",
          "Nested paths like `docker/Dockerfile`",
          "Multi-stage names such as `runner` or `production`",
        ],
      },
      {
        type: "p",
        text: "You can override Dockerfile path, Docker context, and build stage in Settings (or Advanced options when creating an app).",
      },
      { type: "h2", text: "Live logs" },
      {
        type: "p",
        text: "The Logs tab streams runtime output over a live connection (SSE). Leave **Live** on to follow new lines; pause anytime, or copy / download the buffer.",
      },
      { type: "h2", text: "Redeploy & auto-deploy" },
      {
        type: "ul",
        items: [
          "**Redeploy** rebuilds from the connected branch with current settings.",
          "With auto-deploy enabled, pushes to that branch trigger a new deploy (via the HostingIt GitHub App).",
        ],
      },
      { type: "h2", text: "When a build fails" },
      {
        type: "p",
        text: "Open the Deployments tab and read the build log. Common fixes:",
      },
      {
        type: "ul",
        items: [
          "Wrong root directory for a monorepo",
          "Dockerfile path does not match the repo",
          "Missing env vars or build secrets",
        ],
      },
      {
        type: "p",
        text: "Use **Scan repo again** on a failed deploy for alternate folders HostingIt found. More detail in [Apps & limits](/docs/apps).",
      },
    ],
  },
  {
    slug: "variables",
    href: "/docs/variables",
    title: "Variables & secrets",
    description: "Runtime environment variables and build-only secrets.",
    blocks: [
      { type: "h2", text: "Environment variables" },
      {
        type: "p",
        text: "Set runtime variables from your app's **Variables** tab. Use these for API keys, database URLs, feature flags, and anything your process reads at runtime.",
      },
      {
        type: "ul",
        items: [
          "Mark sensitive values as **Secret** so they stay masked in the dashboard.",
          "After saving, **redeploy** so the new values are applied.",
        ],
      },
      { type: "h2", text: "Build secrets" },
      {
        type: "p",
        text: "Build secrets are available only during the image build (for example private npm registry tokens). They are not baked into the running container as ordinary env unless you copy them yourself in the Dockerfile.",
      },
      { type: "h2", text: "On create" },
      {
        type: "p",
        text: "When creating an app, open advanced options to set variables before the first deploy. If you are not ready yet, uncheck **Deploy immediately**, configure variables on the app page, then redeploy.",
      },
      {
        type: "callout",
        text: "**Frontend + backend tip.** Put the backend public URL in the frontend app's env (for example `NEXT_PUBLIC_API_URL`), and configure CORS on the backend for the frontend origin.",
      },
    ],
  },
  {
    slug: "domains",
    href: "/docs/domains",
    title: "Domains",
    description: "Free HostingIt subdomains and custom domains on Pro.",
    blocks: [
      { type: "h2", text: "Free subdomain" },
      {
        type: "p",
        text: "Every app gets an HTTPS subdomain on HostingIt, for example `{{host}}`. No DNS setup required.",
      },
      { type: "h2", text: "Custom domains (Pro)" },
      {
        type: "p",
        text: "On Pro and above you can attach your own domain from the app detail page.",
      },
      {
        type: "ol",
        items: [
          "Add the domain in the HostingIt dashboard.",
          "Create a **CNAME** (or the record we show) pointing at your app's HostingIt hostname.",
          "Wait for DNS to propagate: SSL is issued automatically.",
        ],
      },
      {
        type: "p",
        text: "Free plan stays on the shared subdomain. Manage your plan from [billing](/dashboard/billing).",
      },
    ],
  },
  {
    slug: "roadmap",
    href: "/docs/roadmap",
    title: "Roadmap",
    description:
      "Where HostingIt is headed: Infra capacity and multi-node scaling.",
    blocks: [
      { type: "h2", text: "How you run on HostingIt" },
      {
        type: "table",
        headers: ["Surface", "For", "Status"],
        rows: [
          ["HostingIt Cloud", "Indie devs, hobby projects, first apps", "Available now"],
          [
            "HostingIt Infra",
            "Paid plans on team-scaled infrastructure",
            "Coming soon",
          ],
        ],
      },
      {
        type: "p",
        text: "You always use the same HostingIt panel. Provisioning stays behind the scenes: you deploy apps, we run the infrastructure.",
      },
      { type: "h2", text: "HostingIt Infra" },
      {
        type: "p",
        text: "Team-operated capacity so paid customers get better isolation and room to grow beyond free-tier limits.",
      },
      {
        type: "ul",
        items: [
          "Dedicated nodes for Pro and Enterprise",
          "Multi-region capacity as we expand",
          "Routing, SSL, and monitoring managed by HostingIt",
        ],
      },
      { type: "h2", text: "Multi-node scaling" },
      {
        type: "ol",
        items: [
          "**Multi-node Infra**: several hosts; scheduler picks by plan and load",
          "**Central routing**: one domain front door; each app mapped to its host",
          "**Regions**: EU, US, APAC where it makes sense",
        ],
      },
      { type: "h2", text: "Also planned" },
      {
        type: "ul",
        items: [
          "Richer project grouping for multi-container products",
          "Automated billing",
          "Uptime monitoring and backups",
          "Team / organization accounts",
        ],
      },
      { type: "h2", text: "What stays the same" },
      {
        type: "ul",
        items: [
          "Sign in with GitHub or Google + mandatory 2FA",
          "Connect repo → get a URL → manage in one place",
          "Honest best-effort limits for hobby vs production workloads",
        ],
      },
      {
        type: "p",
        text: "Timelines are approximate. Questions about Infra early access? Reach out from your dashboard, or return to the [docs overview](/docs).",
      },
    ],
  },
];

export function getDocsPage(slug: string): DocsPage | undefined {
  return DOCUMENT.find((page) => page.slug === slug);
}

export function getDocsNeighbors(slug: string): {
  prev: DocsPage | null;
  next: DocsPage | null;
} {
  const index = DOCUMENT.findIndex((page) => page.slug === slug);
  return {
    prev: index > 0 ? DOCUMENT[index - 1] : null,
    next: index >= 0 && index < DOCUMENT.length - 1 ? DOCUMENT[index + 1] : null,
  };
}
