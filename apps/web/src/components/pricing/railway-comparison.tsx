import { RAILWAY_COMPARISON, RAILWAY_PRICING_NOTE } from "@/lib/plans";

export function RailwayComparison() {
  return (
    <section className="mt-20 border-t border-border pt-16">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-bold tracking-tight text-ink">
          HostingIt vs Railway
        </h2>
        <p className="mt-4 text-muted leading-relaxed">
          Railway is great when you want elastic, usage-metered infra. HostingIt
          is for indie devs who want a{" "}
          <strong className="font-medium text-ink">fixed monthly bill</strong>{" "}
          and simple Docker deploys: no RAM/CPU calculator required.
        </p>
      </div>

      <div className="mt-10 overflow-x-auto border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 font-mono text-xs font-medium uppercase tracking-wider text-muted" />
              <th className="px-4 py-3 font-display font-semibold text-ink">
                HostingIt Free
              </th>
              <th className="px-4 py-3 font-display font-semibold text-accent">
                HostingIt Pro
              </th>
              <th className="px-4 py-3 font-medium text-muted">Railway Free</th>
              <th className="px-4 py-3 font-medium text-muted">Railway Hobby</th>
            </tr>
          </thead>
          <tbody>
            {RAILWAY_COMPARISON.map((row) => (
              <tr
                key={row.label}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-ink">{row.label}</td>
                <td className="px-4 py-3 text-foreground">{row.hostingitFree}</td>
                <td className="px-4 py-3 font-medium text-ink">
                  {row.hostingitPro}
                </td>
                <td className="px-4 py-3 text-muted">{row.railwayFree}</td>
                <td className="px-4 py-3 text-muted">{row.railwayHobby}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">{RAILWAY_PRICING_NOTE}</p>

      <div className="mt-10 grid gap-8 border-t border-border pt-10 sm:grid-cols-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            Choose HostingIt
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You deploy Docker apps from GitHub and want predictable pricing
            without watching usage meters.
          </p>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            Choose Railway
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You need databases, cron, and elastic scaling in one platform and
            are comfortable with usage-based billing.
          </p>
        </div>
      </div>
    </section>
  );
}
