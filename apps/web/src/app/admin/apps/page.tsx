"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface AppRecord {
  app: {
    id: string;
    name: string;
    slug: string;
    status: string;
    githubOwner: string;
    githubRepo: string;
    subdomain: string;
  };
  userEmail: string;
}

export default function AdminAppsPage() {
  const [apps, setApps] = useState<AppRecord[]>([]);

  useEffect(() => {
    fetch("/api/admin/apps")
      .then((res) => res.json())
      .then((data) => setApps(data.apps ?? []));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">All Apps</h1>
      <p className="mt-1 text-zinc-600">{apps.length} apps across all users</p>

      <div className="mt-8 space-y-4">
        {apps.map(({ app, userEmail }) => (
          <Card key={app.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="font-medium">{app.name}</p>
                <p className="text-sm text-zinc-500">
                  {userEmail} · {app.githubOwner}/{app.githubRepo}
                </p>
                <p className="text-sm text-blue-600">{app.subdomain}</p>
              </div>
              <Badge status={app.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
