import { PlanCardsSection } from "@/components/pricing/plan-cards-section";
import { RailwayComparison } from "@/components/pricing/railway-comparison";
import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function PricingPage() {
  const session = await getSession();
  const isLoggedIn = !!session?.user?.id;

  return (
    <div>
      <section className="hero-plane relative overflow-hidden border-b border-border">
        <div className="hero-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-accent">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Simple, predictable pricing
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Flat monthly plans: no RAM meters, no CPU surprises. Free is
            available now; Pro paid upgrades are coming soon.
          </p>
          {isLoggedIn && (
            <p className="mt-4 text-sm text-muted">
              Logged in as <strong className="text-ink">{session.user.email}</strong>
              {" · "}
              <Link href="/dashboard/billing" className="text-accent hover:underline">
                Manage billing
              </Link>
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <PlanCardsSection />

        <p className="mt-8 text-center text-sm text-muted">
          Only the Free plan is open right now. Pro and Enterprise billing will
          unlock later: no payment flow yet.
        </p>

        <RailwayComparison />
      </div>
    </div>
  );
}
