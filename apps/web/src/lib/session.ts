import { cache } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/** Dedupe auth() within a single RSC request tree. */
export const getSession = cache(async () => auth());

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}
