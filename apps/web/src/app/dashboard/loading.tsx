export default function DashboardLoading() {
  return (
    <div className="animate-fade-in space-y-8">
      <div className="space-y-3">
        <div className="skeleton skeleton-text h-9 w-48 rounded" />
        <div className="skeleton skeleton-text h-5 w-64 rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-36 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
