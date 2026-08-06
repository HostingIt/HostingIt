import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { canUseCustomDomain } from "@/lib/plans";

const domainSchema = z.object({
  domain: z.string().min(3),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = domainSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const plan = session.user.plan ?? "free";
  if (!canUseCustomDomain(plan)) {
    return NextResponse.json(
      { error: "Custom domains require Pro plan or higher" },
      { status: 403 }
    );
  }

  const [app] = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, session.user.id)))
    .limit(1);

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    const dokploy = getDokployClient();
    const domain = await dokploy.createDomain({
      host: parsed.data.domain,
      applicationId: app.dokployAppId,
    });

    await db
      .update(apps)
      .set({
        customDomain: parsed.data.domain,
        dokployDomainId:
          (domain as { domainId?: string }).domainId ?? app.dokployDomainId,
        updatedAt: new Date(),
      })
      .where(eq(apps.id, app.id));

    return NextResponse.json({ success: true, domain: parsed.data.domain });
  } catch (error) {
    console.error("Custom domain error:", error);
    return NextResponse.json(
      { error: "Failed to add custom domain" },
      { status: 500 }
    );
  }
}
