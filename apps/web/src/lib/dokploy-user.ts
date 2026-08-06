import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getDokployClient } from "@/lib/dokploy";
import { DokployError } from "@hostingit/dokploy-client";

export interface UserDokployContext {
  projectId: string;
  environmentId: string;
}

function pickDefaultEnvironment(
  environments: Array<{ environmentId: string; isDefault?: boolean }> | undefined
): string {
  if (!environments?.length) return "";
  return (
    environments.find((env) => env.isDefault)?.environmentId ??
    environments[0]?.environmentId ??
    ""
  );
}

/** Validate stored Dokploy project/environment or recreate / rediscover them. */
export async function ensureUserDokployEnvironment(user: {
  id: string;
  email: string;
  dokployProjectId: string | null;
  dokployEnvironmentId: string | null;
}): Promise<UserDokployContext> {
  const dokploy = getDokployClient();
  const expectedName = `hostingit-${user.id.slice(0, 8)}`;

  async function validate(
    projectId: string,
    environmentId: string
  ): Promise<UserDokployContext | null> {
    try {
      const project = await dokploy.getProject(projectId);
      const envIds = new Set(
        project.environments?.map((env) => env.environmentId) ?? []
      );

      if (envIds.has(environmentId)) {
        return { projectId, environmentId };
      }

      const fallback = pickDefaultEnvironment(project.environments);
      if (fallback) {
        return { projectId, environmentId: fallback };
      }
    } catch (error) {
      if (
        !(error instanceof DokployError) ||
        error.statusCode !== 404
      ) {
        throw error;
      }
    }
    return null;
  }

  if (user.dokployProjectId && user.dokployEnvironmentId) {
    const valid = await validate(
      user.dokployProjectId,
      user.dokployEnvironmentId
    );
    if (valid) {
      if (
        valid.projectId !== user.dokployProjectId ||
        valid.environmentId !== user.dokployEnvironmentId
      ) {
        await persist(user.id, valid);
      }
      return valid;
    }
  }

  const projects = await dokploy.listProjects();
  const existing = projects.find((project) => project.name === expectedName);
  if (existing?.projectId) {
    let environmentId = pickDefaultEnvironment(existing.environments);
    if (!environmentId) {
      const details = await dokploy.getProject(existing.projectId);
      environmentId = pickDefaultEnvironment(details.environments);
    }
    if (environmentId) {
      const ctx = { projectId: existing.projectId, environmentId };
      await persist(user.id, ctx);
      return ctx;
    }
  }

  const created = await dokploy.createProject({
    name: expectedName,
    description: `HostingIt project for ${user.email}`,
  });

  const { projectId } = created;
  let { environmentId } = created;

  if (!environmentId) {
    const details = await dokploy.getProject(projectId);
    environmentId = pickDefaultEnvironment(details.environments);
  }

  if (!projectId || !environmentId) {
    throw new Error("Failed to resolve Dokploy project/environment IDs");
  }

  const ctx = { projectId, environmentId };
  await persist(user.id, ctx);
  return ctx;
}

async function persist(userId: string, ctx: UserDokployContext) {
  await db
    .update(users)
    .set({
      dokployProjectId: ctx.projectId,
      dokployEnvironmentId: ctx.environmentId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
