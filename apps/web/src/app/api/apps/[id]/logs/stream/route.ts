import { getDokployClient } from "@/lib/dokploy";
import { getOwnedApp } from "@/lib/app-access";
import { assertDeploymentBelongsToApp } from "@/lib/deploy-log-access";
import { sanitizeDeployLogs } from "@/lib/deploy-hints";
import { requireApiUser } from "@/lib/api-auth";
import {
  parseLogSearch,
  parseLogSince,
  parseLogTail,
  parseOptionalLogTail,
} from "@/lib/log-query";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 1500;
const HEARTBEAT_MS = 15000;
/** The client reconnects on close, so a cap only bounds abandoned streams. */
const MAX_STREAM_MS = 30 * 60 * 1000;
/** Each open stream polls the deploy platform, so cap them per user. */
const MAX_STREAMS_PER_USER = 4;

const openStreams = new Map<string, number>();

function acquireStream(userId: string): boolean {
  const current = openStreams.get(userId) ?? 0;
  if (current >= MAX_STREAMS_PER_USER) return false;
  openStreams.set(userId, current + 1);
  return true;
}

function releaseStream(userId: string): void {
  const current = openStreams.get(userId) ?? 0;
  if (current <= 1) openStreams.delete(userId);
  else openStreams.set(userId, current - 1);
}

function fingerprint(text: string): string {
  return `${text.length}:${text.slice(-240)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const app = await getOwnedApp(authResult.user.id, id);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "runtime";
  const deploymentId = searchParams.get("deploymentId");
  const tailParam = searchParams.get("tail");
  const since = parseLogSince(searchParams.get("since"));
  const search = parseLogSearch(searchParams.get("search"));

  const userId = authResult.user.id;
  if (!acquireStream(userId)) {
    return new Response("Too many open log streams", {
      status: 429,
      headers: { "Retry-After": "30" },
    });
  }

  const dokploy = getDokployClient();
  const encoder = new TextEncoder();
  let closed = false;
  let lastFp = "";
  let shutdown = () => {
    if (closed) return;
    closed = true;
    releaseStream(userId);
  };

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
              parseOptionalLogTail(tailParam)
            );
          } else {
            logs = await dokploy.getApplicationLogs(app.dokployAppId, {
              tail: parseLogTail(tailParam),
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
      const lifetimeTimer = setTimeout(() => shutdown(), MAX_STREAM_MS);

      shutdown = () => {
        if (closed) return;
        closed = true;
        clearInterval(pollTimer);
        clearInterval(beatTimer);
        clearTimeout(lifetimeTimer);
        releaseStream(userId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", shutdown);
      if (request.signal.aborted) shutdown();
    },
    cancel() {
      shutdown();
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
