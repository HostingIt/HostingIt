import { getSession } from "@/lib/session";
import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { assertDeploymentBelongsToApp } from "@/lib/deploy-log-access";
import { sanitizeDeployLogs } from "@/lib/deploy-hints";
import type { LogSince } from "@hostingit/dokploy-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LOG_SINCE_PATTERN = /^(\d+)([smhd])$/;
const POLL_MS = 1500;
const HEARTBEAT_MS = 15000;

function parseLogSince(value: string | null): LogSince | undefined {
  if (!value || value === "all") return undefined;
  return LOG_SINCE_PATTERN.test(value) ? (value as LogSince) : undefined;
}

function fingerprint(text: string): string {
  return `${text.length}:${text.slice(-240)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const app = await getOwnedApp(session.user.id, id);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "runtime";
  const deploymentId = searchParams.get("deploymentId");
  const tail = searchParams.get("tail");
  const since = parseLogSince(searchParams.get("since"));
  const search = searchParams.get("search") ?? undefined;

  const dokploy = getDokployClient();
  const encoder = new TextEncoder();
  let closed = false;
  let lastFp = "";

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const ping = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
      };

      const pull = async () => {
        if (closed) return;
        try {
          let logs = "";
          if (type === "build" && deploymentId) {
            const allowed = await assertDeploymentBelongsToApp(
              dokploy,
              app.id,
              app.dokployAppId,
              deploymentId
            );
            if (!allowed) {
              send("stream-error", { message: "Deployment not found" });
              return;
            }
            logs = await dokploy.getDeploymentLogs(
              deploymentId,
              tail ? Number(tail) : undefined
            );
          } else {
            logs = await dokploy.getApplicationLogs(app.dokployAppId, {
              tail: tail ? Number(tail) : 200,
              since,
              search,
            });
          }
          const text = sanitizeDeployLogs(logs);
          const fp = fingerprint(text);
          if (fp !== lastFp) {
            lastFp = fp;
            send("logs", { text, at: Date.now() });
          }
        } catch {
          send("stream-error", { message: "Unable to fetch logs." });
        }
      };

      void pull();
      const pollTimer = setInterval(() => void pull(), POLL_MS);
      const beatTimer = setInterval(ping, HEARTBEAT_MS);

      const shutdown = () => {
        if (closed) return;
        closed = true;
        clearInterval(pollTimer);
        clearInterval(beatTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", shutdown);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
