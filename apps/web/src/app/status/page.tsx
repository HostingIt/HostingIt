export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold text-ink">System Status</h1>
      <p className="mt-4 text-muted">
        Best-effort hosting for hobby projects and small applications.
      </p>

      <div className="mt-12 space-y-4">
        <StatusItem name="Control Panel" status="operational" />
        <StatusItem name="Deployments" status="operational" />
        <StatusItem name="User Apps" status="operational" />
      </div>

      <p className="mt-12 text-sm text-muted">
        For incidents, check back here or contact support@hostingit.online.
      </p>
    </div>
  );
}

function StatusItem({
  name,
  status,
}: {
  name: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
      <span className="font-medium text-ink">{name}</span>
      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium capitalize text-green-800 dark:bg-green-500/15 dark:text-green-400">
        {status}
      </span>
    </div>
  );
}
