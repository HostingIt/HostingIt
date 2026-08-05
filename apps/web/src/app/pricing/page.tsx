import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <p className="mt-4 text-zinc-600">
          Start free. Upgrade when you need more apps or custom domains.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-4">
        {Object.entries(PLANS).map(([key, plan]) => (
          <div
            key={key}
            className="rounded-lg border border-zinc-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-bold">{plan.priceLabel}</p>
            <p className="mt-4 text-sm text-zinc-600">{plan.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              <li>Up to {plan.maxApps} apps</li>
              <li>{plan.customDomain ? "Custom domains" : "Subdomain only"}</li>
            </ul>
            {key !== "business" ? (
              <Link href="/signup" className="mt-6 block">
                <Button className="w-full" variant={key === "free" ? "outline" : "default"}>
                  {key === "free" ? "Start free" : "Get started"}
                </Button>
              </Link>
            ) : (
              <Link href="mailto:support@yourdomain.com" className="mt-6 block">
                <Button className="w-full" variant="outline">
                  Contact us
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-zinc-500">
        Paid plans are activated manually after payment verification (UPI, PayPal,
        or bank transfer).
      </p>
    </div>
  );
}
