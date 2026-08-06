import { getSession } from "@/lib/session";
import { PlanCards } from "./plan-cards";

interface PlanCardsSectionProps {
  showActions?: boolean;
  compact?: boolean;
}

export async function PlanCardsSection({
  showActions = true,
  compact = false,
}: PlanCardsSectionProps) {
  const session = await getSession();

  return (
    <PlanCards
      showActions={showActions}
      compact={compact}
      isLoggedIn={!!session?.user?.id}
      currentPlan={session?.user?.plan}
    />
  );
}
