export default function AppDetailLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="skeleton skeleton-text h-4 w-24" />
          <div className="skeleton skeleton-text h-9 w-56" />
          <div className="skeleton skeleton-text h-5 w-40" />
        </div>
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-32 w-full rounded-lg" />
        <div className="skeleton h-32 w-full rounded-lg" />
      </div>
      <div className="skeleton h-40 w-full rounded-lg" />
      <div className="skeleton h-64 w-full rounded-lg" />
    </div>
  );
}
