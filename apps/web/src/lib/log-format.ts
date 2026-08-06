export type LogLineTone =
  | "default"
  | "error"
  | "warn"
  | "success"
  | "info"
  | "dim";

/** Classify a log line for terminal tinting. */
export function toneForLogLine(line: string): LogLineTone {
  const lower = line.toLowerCase();
  if (
    lower.includes(" error") ||
    lower.includes("error:") ||
    lower.includes("err!") ||
    lower.includes("❌") ||
    lower.includes("failed") ||
    lower.includes("fatal") ||
    lower.includes("exception")
  ) {
    return "error";
  }
  if (
    lower.includes("warn") ||
    lower.includes("warning") ||
    lower.includes("deprecated")
  ) {
    return "warn";
  }
  if (
    lower.includes("✓") ||
    lower.includes("success") ||
    lower.includes(" ready") ||
    lower.includes("listening") ||
    lower.includes("started")
  ) {
    return "success";
  }
  if (
    lower.includes("info") ||
    lower.includes("→") ||
    lower.includes("http") ||
    lower.includes("get ") ||
    lower.includes("post ")
  ) {
    return "info";
  }
  if (!line.trim()) return "dim";
  return "default";
}

export function splitLogLines(logs: string): string[] {
  if (!logs) return [];
  return logs.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}
