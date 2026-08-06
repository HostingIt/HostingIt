import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS, normalizePlan, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

const PLAN_ORDER: Plan[] = ["free", "pro", "enterprise"];

interface PlanCardsProps {
  showActions?: boolean;
  compact?: boolean;
  isLoggedIn?: boolean;
  currentPlan?: string;
}

export function PlanCards({
  showActions = true,
  compact = false,
  isLoggedIn = false,
  currentPlan = "free",
}: PlanCardsProps) {
  const activePlan = normalizePlan(currentPlan);

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_ORDER.map((key) => {
        const plan = PLANS[key];
        const isCurrent = isLoggedIn && activePlan === key;

        return (
          <div
            key={key}
            className={cn(
              "relative flex flex-col border bg-surface p-6 transition-colors",
              plan.highlight
                ? "border-accent bg-accent/[0.04]"
                : "border-border",
              plan.comingSoon && "opacity-80",
              isCurrent && "ring-2 ring-accent/40"
            )}
          >
            {plan.highlight && !isCurrent && (
              <span className="absolute -top-2.5 left-4 bg-accent px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white">
                Popular
              </span>
            )}
            {isCurrent && (
              <span className="absolute -top-2.5 left-4 bg-ink px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-background">
                Current plan
              </span>
            )}
            {plan.comingSoon && (
              <span className="absolute -top-2.5 left-4 border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                Soon
              </span>
            )}

            <h2 className="font-display text-xl font-semibold text-ink">
              {plan.name}
            </h2>
            <p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
              {plan.priceLabel}
            </p>
            {plan.priceNote && (
              <p className="mt-1 font-mono text-xs text-muted">{plan.priceNote}</p>
            )}
            {!compact && (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {plan.description}
              </p>
            )}

            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-muted">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span className="mt-0.5 font-mono text-accent" aria-hidden>
                    →
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {showActions && (
              <div className="mt-6">
                <PlanCardAction
                  planKey={key}
                  isLoggedIn={isLoggedIn}
                  isCurrent={isCurrent}
                  comingSoon={!!plan.comingSoon}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlanCardAction({
  planKey,
  isLoggedIn,
  isCurrent,
  comingSoon,
}: {
  planKey: Plan;
  isLoggedIn: boolean;
  isCurrent: boolean;
  comingSoon: boolean;
}) {
  if (comingSoon) {
    return (
      <Button className="w-full" variant="outline" disabled>
        Coming soon
      </Button>
    );
  }

  if (isCurrent) {
    return (
      <Link href="/dashboard/billing" className="block">
        <Button className="w-full" variant="outline">
          Manage billing
        </Button>
      </Link>
    );
  }

  if (isLoggedIn) {
    if (planKey === "free") {
      return (
        <Link href="/dashboard" className="block">
          <Button className="w-full" variant="outline">
            Open dashboard
          </Button>
        </Link>
      );
    }
    if (planKey === "pro") {
      return (
        <Link href="/dashboard/billing" className="block">
          <Button className="w-full">Upgrade to Pro</Button>
        </Link>
      );
    }
  }

  if (planKey === "free") {
    return (
      <Link href="/signup" className="block">
        <Button className="w-full" variant="outline">
          Start free
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/signup" className="block">
      <Button className="w-full">Get Pro</Button>
    </Link>
  );
}
