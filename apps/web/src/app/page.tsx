import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlanCardsSection } from "@/components/pricing/plan-cards-section";
import { getAppHostname } from "@/lib/dokploy";

export default function HomePage() {
  const exampleHost = getAppHostname("api-a1b2c3d4e5f6");
  return (
    <div>
      {/* Hero: one composition: brand, headline, support, CTAs, visual plane */}
      <section className="hero-plane relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="hero-grid absolute inset-0" aria-hidden />

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-4 pb-24 pt-16 lg:pb-32">
          <div className="max-w-2xl">
            <div className="animate-fade-up flex items-center gap-4 sm:gap-5">
              <Image
                src="/brand/mark-light.png"
                alt=""
                width={72}
                height={72}
                className="h-14 w-14 object-contain sm:h-16 sm:w-16 dark:hidden"
                priority
              />
              <Image
                src="/brand/mark-dark.png"
                alt=""
                width={72}
                height={72}
                className="hidden h-14 w-14 object-contain sm:h-16 sm:w-16 dark:block"
                priority
              />
              <p className="font-display text-5xl font-extrabold tracking-tight text-ink sm:text-6xl lg:text-7xl">
                Hosting<span className="text-accent">It</span>
              </p>
            </div>
            <h1 className="animate-fade-up-delay mt-6 font-display text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-3xl">
              Deploy Docker apps from GitHub in minutes.
            </h1>
            <p className="animate-fade-up-delay-2 mt-4 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              Connect a repo, get a live URL with SSL: flat pricing, no cloud
              maze.
            </p>
            <div className="animate-fade-up-delay-2 mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" className="px-8">
                  Start free
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-ink/20 bg-surface/70 backdrop-blur-sm hover:bg-surface"
                >
                  See pricing
                </Button>
              </Link>
            </div>
          </div>

          {/* Dominant visual: terminal deploy scene as atmospheric plane */}
          <div
            className="animate-fade-in animate-drift pointer-events-none absolute bottom-8 right-4 hidden w-[min(440px,42vw)] lg:block"
            aria-hidden
          >
            <div className="terminal overflow-hidden rounded-lg border border-white/10 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)]">
              <div className="terminal-chrome flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                <span className="h-2 w-2 rounded-sm bg-white/25" />
                <span className="h-2 w-2 rounded-sm bg-white/25" />
                <span className="h-2 w-2 rounded-sm bg-white/25" />
                <span className="ml-2 font-mono text-[10px] text-white/40">
                  deploy · my-api
                </span>
              </div>
              <pre className="space-y-1 p-4 font-mono text-[11px] leading-relaxed text-[var(--terminal-text)]">
                <code className="block opacity-45">$ hostingit deploy</code>
                <code className="block">→ cloning github.com/you/api</code>
                <code className="block">→ building Dockerfile</code>
                <code className="block">→ provisioning SSL</code>
                <code className="block text-accent">✓ live at {exampleHost}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* How it works: one job */}
      <section className="border-t border-border bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            From repo to URL
          </h2>
          <p className="mt-3 max-w-xl text-muted">
            Three steps. No YAML maze, no cloud console hopping.
          </p>

          <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                title: "Connect GitHub",
                desc: "Sign in and link the repos you want to ship.",
              },
              {
                step: "02",
                title: "Pick & deploy",
                desc: "Choose a branch. We build your Docker image.",
              },
              {
                step: "03",
                title: "Go live",
                desc: "Get a subdomain with SSL, or attach your domain on Pro.",
              },
            ].map((item) => (
              <li key={item.step} className="relative">
                <span className="font-mono text-sm font-medium text-accent">
                  {item.step}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who it's for: one job */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Built for indie builders
          </h2>
          <p className="mt-3 max-w-xl text-muted">
            Hobby apps and side projects, not mission-critical production.
          </p>

          <div className="mt-14 grid gap-y-10 sm:grid-cols-3 sm:gap-x-10">
            {[
              {
                title: "GitHub-native",
                desc: "Deploy from the repos you already push to.",
              },
              {
                title: "Docker-first",
                desc: "If it runs in a container, it runs here.",
              },
              {
                title: "Predictable bill",
                desc: "Flat monthly plans: no RAM meters or egress surprises.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing tease */}
      <section className="border-t border-border bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Flat pricing
              </h2>
              <p className="mt-3 max-w-md text-muted">
                Free is open now. Pro billing is coming soon.
              </p>
            </div>
            <Link href="/pricing">
              <Button
                variant="outline"
                className="border-ink/15 hover:border-ink/30 hover:bg-background"
              >
                Compare with Railway →
              </Button>
            </Link>
          </div>
          <div className="mt-12">
            <PlanCardsSection showActions={false} compact />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Ship something this weekend
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Start on Free with one deployable app, subdomain, and SSL. Pro
            upgrades coming soon.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" variant="accent" className="px-8">
                Create your account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
