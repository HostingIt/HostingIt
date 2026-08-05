"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((res) => {
        setStatus(res.ok ? "success" : "error");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
        <CardDescription>
          {status === "loading" && "Verifying your email..."}
          {status === "success" && "Your email has been verified!"}
          {status === "error" && "Verification failed or link expired."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status !== "loading" && (
          <Link href="/login">
            <Button className="w-full">Go to login</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
