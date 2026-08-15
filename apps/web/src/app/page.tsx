import Image from "next/image";
import { DeployPreview } from "@/components/home/deploy-preview";
import { HomeAuthCta } from "@/components/home/home-auth-cta";
import { HomeShowcase } from "@/components/home/home-showcase";
import { getSession } from "@/lib/session";

const LIVE_GAME_URL = "https://fhusr-test-b30ece847eb3.hostingit.online/";

const STEPS = [
  {
    num: "1",
    title: "Connect GitHub",
    desc: "Sign in and pick the repository you already push to.",
  },
  {
    num: "2",
    title: "We build the image",
    desc: "Your Dockerfile becomes a running container. No YAML maze.",
  },
  {
    num: "3",
    title: "Share a live URL",
    desc: "SSL is included. Attach your own domain when you upgrade.",
  },
] as const;

const STATS = [
  { value: "2 min", label: "Typical deploy" },
  { value: "$0", label: "To start" },
  { value: "GitHub", label: "From your repo" },
  { value: "SSL", label: "Included" },
] as const;

export default async function HomePage() {
  const session = await getSession();
  const loggedIn = !!session?.user;

  return (
    <>
      <section className="home-wrap home-hero">
        <div className="home-hero-copy">
          <p className="home-agent">AI agent coming soon for deployment</p>
          <p className="home-kicker">Docker hosting for indie builders</p>
          <h1 className="home-title">
            Git push.
            <br />
            Container live.
          </h1>
          <p className="home-lede">
            Connect a repo. We build the image, provision SSL, and give you a
            URL. Flat pricing, no cloud maze.
          </p>
          <HomeAuthCta loggedIn={loggedIn} />
        </div>
        <dl className="home-hero-stats">
          {STATS.map((stat) => (
            <div key={stat.label} className="home-stat">
              <dt className="home-stat-value">{stat.value}</dt>
              <dd className="home-stat-label">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <HomeShowcase>
        <div className="home-wrap">
          <h2 className="home-showcase-title">
            Host games, APIs, and sites that stay live
          </h2>
          <div className="home-showcase-grid">
            <a
              className="home-showcase-visual"
              href={LIVE_GAME_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Image
                src="/brand/showcase-prism-break.jpg"
                alt="Prism Break, a web game hosted on HostingIt"
                width={1920}
                height={925}
                className="home-showcase-photo"
              />
            </a>
            <div className="home-showcase-aside">
              <h3 className="home-showcase-aside-title">
                Prism Break is live on HostingIt.
              </h3>
              <p className="home-showcase-aside-copy">
                A front-end web game, shipped from GitHub to a public URL with
                SSL. Same path as an API or a portfolio.
              </p>
              <p className="home-showcase-label">Features</p>
              <ul className="home-showcase-features">
                <li>Static front-end</li>
                <li>Automatic SSL</li>
                <li>Unique live URL</li>
                <li>No cloud console</li>
              </ul>
              <a
                href={LIVE_GAME_URL}
                target="_blank"
                rel="noreferrer"
                className="home-text-link"
              >
                Open live site
              </a>
            </div>
          </div>
        </div>
      </HomeShowcase>

      <HomeShowcase flip>
        <div className="home-wrap">
          <h2 className="home-showcase-title">One click deploy</h2>
          <div className="home-showcase-grid">
            <div className="home-showcase-visual home-showcase-visual-ui">
              <DeployPreview />
            </div>
            <div className="home-showcase-aside">
              <h3 className="home-showcase-aside-title">
                Name the app. Pick the repo. Deploy.
              </h3>
              <p className="home-showcase-aside-copy">
                Connect GitHub once. Then every new app is a name, a repository,
                and a branch.
              </p>
              <p className="home-showcase-label">Features</p>
              <ul className="home-showcase-features">
                <li>GitHub App access</li>
                <li>Branch picker</li>
                <li>Dockerfile detected</li>
                <li>SSL on first boot</li>
              </ul>
            </div>
          </div>
        </div>
      </HomeShowcase>

      <section className="home-wrap home-section">
        <div className="home-section-head">
          <h2 className="home-section-title">From repo to URL</h2>
          <p className="home-section-lede">
            Three steps. No console hopping.
          </p>
        </div>
        <ol className="home-steps">
          {STEPS.map((step) => (
            <li key={step.num} className="home-step">
              <span className="home-step-num">{step.num}</span>
              <h3 className="home-step-title">{step.title}</h3>
              <p className="home-step-desc">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
