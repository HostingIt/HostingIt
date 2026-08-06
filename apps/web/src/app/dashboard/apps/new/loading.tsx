export default function DashboardSubLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-3">
        <div className="skeleton skeleton-text h-9 w-40" />
        <div className="skeleton skeleton-text h-5 w-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-72 w-full rounded-lg" />
        <div className="skeleton h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}
