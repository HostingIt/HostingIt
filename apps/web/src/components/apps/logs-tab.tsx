"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PickerModal } from "@/components/ui/picker-modal";
import { LogTerminal } from "@/components/apps/log-terminal";

const TAIL_OPTIONS = [100, 200, 500, 1000];
const SINCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
];

type StreamStatus = "idle" | "connecting" | "live" | "paused" | "error";

export function LogsTab({ appId }: { appId: string }) {
  const [logs, setLogs] = useState("");
  const [tail, setTail] = useState(200);
  const [since, setSince] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [live, setLive] = useState(true);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("connecting");
  const [copied, setCopied] = useState(false);

  const status: StreamStatus = live ? streamStatus : "paused";

  const streamUrl = useMemo(() => {
    const params = new URLSearchParams({
      tail: String(tail),
      since,
      type: "runtime",
    });
    if (search.trim()) params.set("search", search.trim());
    return `/api/apps/${appId}/logs/stream?${params.toString()}`;
  }, [appId, tail, since, search]);

  useEffect(() => {
    if (!live) return;

    const es = new EventSource(streamUrl);
    queueMicrotask(() => setStreamStatus("connecting"));

    es.addEventListener("logs", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          text?: string;
        };
        setLogs(data.text ?? "");
        setStreamStatus("live");
      } catch {
        setStreamStatus("error");
      }
    });

    es.addEventListener("stream-error", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          message?: string;
        };
        if (data.message) setLogs(data.message);
        setStreamStatus("error");
      } catch {
        setStreamStatus("error");
      }
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CONNECTING) {
        setStreamStatus("connecting");
      } else if (es.readyState === EventSource.CLOSED) {
        setStreamStatus("error");
      }
    };

    return () => {
      es.close();
    };
  }, [live, streamUrl]);

  function applySearch() {
    setSearch(searchDraft);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function download() {
    const blob = new Blob([logs || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hostingit-${appId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <PickerModal
          title="Log lines"
          size="sm"
          value={String(tail)}
          options={TAIL_OPTIONS.map((n) => ({
            value: String(n),
            label: `${n} lines`,
          }))}
          onChange={(v) => setTail(Number(v))}
        />
        <PickerModal
          title="Time window"
          size="sm"
          value={since}
          options={SINCE_OPTIONS}
          onChange={setSince}
        />
        <form
          className="flex min-w-[12rem] flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
        >
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Filter logs…"
            className="h-9 font-mono text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
        <Button
          size="sm"
          variant={live ? "accent" : "outline"}
          onClick={() => setLive((v) => !v)}
        >
          {live ? "Live" : "Paused"}
        </Button>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="ghost" size="sm" onClick={download}>
          Download
        </Button>
      </div>

      <LogTerminal
        title="runtime"
        subtitle={live ? "SSE stream" : "paused"}
        logs={logs}
        live={live && status === "live"}
        status={status}
        emptyMessage={
          status === "connecting"
            ? "Connecting to log stream…"
            : status === "error"
              ? "Stream disconnected. Toggle Live to reconnect."
              : "No logs available yet."
        }
      />
    </div>
  );
}
