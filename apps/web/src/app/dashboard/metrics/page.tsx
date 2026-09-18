import { Suspense } from "react";
import { MetricsClient } from "./metrics-client";

export default function MetricsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-56 w-full rounded-lg" />
          ))}
        </div>
      }
    >
      <MetricsClient />
    </Suspense>
  );
}
