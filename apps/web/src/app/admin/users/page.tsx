"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  accountStatus: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []));
  }, []);

  async function updateUser(
    userId: string,
    updates: { accountStatus?: string; plan?: string }
  ) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...updates }),
    });
    const data = await fetch("/api/admin/users").then((r) => r.json());
    setUsers(data.users ?? []);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Users</h1>
      <p className="mt-1 text-zinc-600">{users.length} total users</p>

      <div className="mt-8 space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-zinc-500">
                  {user.name ?? "No name"} · {user.role}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge status={user.plan} />
                  <Badge status={user.accountStatus} />
                </div>
              </div>
              <div className="flex gap-2">
                {user.accountStatus !== "active" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateUser(user.id, { accountStatus: "active" })
                    }
                  >
                    Activate
                  </Button>
                )}
                {user.accountStatus !== "suspended" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      updateUser(user.id, { accountStatus: "suspended" })
                    }
                  >
                    Suspend
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
