import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900">
          Deploy Docker apps in minutes
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
          HostingIt is a developer platform for Docker apps. Connect GitHub,
          pick a repo, and get a live URL with SSL — no cloud provider
          complexity.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500">
          Best-effort hosting for hobby projects and small applications. Not
          suitable for mission-critical production workloads.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Start free</Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline">
              Read docs
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Built for small developers</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "GitHub deploys",
                desc: "Connect your repo and deploy on every push.",
              },
              {
                title: "Free subdomain",
                desc: "Get myapp.yourdomain.com with automatic SSL.",
              },
              {
                title: "Docker native",
                desc: "Node.js, Python, static sites — if it runs in Docker, it runs here.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-zinc-200 p-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-zinc-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {Object.entries(PLANS).map(([key, plan]) => (
              <div
                key={key}
                className="rounded-lg border border-zinc-200 bg-white p-6"
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold">{plan.priceLabel}</p>
                <p className="mt-4 text-sm text-zinc-600">{plan.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing">
              <Button variant="outline">View all plans</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
