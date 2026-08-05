export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">System Status</h1>
      <p className="mt-4 text-zinc-600">
        Best-effort hosting for hobby projects and small applications.
      </p>

      <div className="mt-12 space-y-4">
        <StatusItem name="Control Panel" status="operational" />
        <StatusItem name="Deployments" status="operational" />
        <StatusItem name="User Apps" status="operational" />
      </div>

      <p className="mt-12 text-sm text-zinc-500">
        For incidents, check back here or contact support@yourdomain.com.
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
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
      <span className="font-medium">{name}</span>
      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 capitalize">
        {status}
      </span>
    </div>
  );
}
