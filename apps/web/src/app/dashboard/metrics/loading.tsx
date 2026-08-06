export default function MetricsLoading() {
  return (
    <div className="animate-fade-in space-y-8">
      <div className="space-y-3">
        <div className="skeleton skeleton-text h-9 w-40 rounded" />
        <div className="skeleton skeleton-text h-5 w-72 rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-56 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
