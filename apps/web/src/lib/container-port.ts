export const DEFAULT_CONTAINER_PORT = 3000;
export const STATIC_CONTAINER_PORT = 80;

const PORT_MIN = 1;
const PORT_MAX = 65535;

export function parsePortNumber(
  raw: string | number | null | undefined
): number | null {
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < PORT_MIN || raw > PORT_MAX) return null;
    return raw;
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^\d{1,5}$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  if (n < PORT_MIN || n > PORT_MAX) return null;
  return n;
}

export function parseEnvPort(
  env: { key: string; value: string }[] | null | undefined
): number | null {
  if (!env) return null;
  for (const row of env) {
    if (row.key.trim().toUpperCase() === "PORT") {
      return parsePortNumber(row.value);
    }
  }
  return null;
}

/** Last TCP EXPOSE in a Dockerfile, ignoring UDP-only. */
export function parseDockerfileExpose(dockerfile: string): number | null {
  let found: number | null = null;
  for (const line of dockerfile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^EXPOSE\s+(.+)$/i.exec(trimmed);
    if (!match) continue;
    const tokens = match[1].split(/\s+/);
    for (const token of tokens) {
      const [portPart, proto] = token.split("/");
      if (proto && proto.toLowerCase() === "udp") continue;
      const port = parsePortNumber(portPart);
      if (port !== null) found = port;
    }
  }
  return found;
}

/** ENV PORT=3400 / ENV PORT 3400 in a Dockerfile. */
export function parseDockerfileEnvPort(dockerfile: string): number | null {
  let found: number | null = null;
  for (const line of dockerfile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^ENV\s+PORT(?:\s*=\s*|\s+)(\S+)/i.exec(trimmed);
    if (!match) continue;
    const port = parsePortNumber(match[1]);
    if (port !== null) found = port;
  }
  return found;
}

export function parseDockerfilePort(dockerfile: string): number | null {
  return parseDockerfileEnvPort(dockerfile) ?? parseDockerfileExpose(dockerfile);
}

export function resolveContainerPort(input: {
  buildType?: string | null;
  env?: { key: string; value: string }[] | null;
  dockerfileText?: string | null;
  override?: number | null;
}): number {
  if (input.override != null) {
    return parsePortNumber(input.override) ?? DEFAULT_CONTAINER_PORT;
  }
  if (input.buildType === "static") return STATIC_CONTAINER_PORT;
  return (
    parseEnvPort(input.env) ??
    (input.dockerfileText ? parseDockerfilePort(input.dockerfileText) : null) ??
    DEFAULT_CONTAINER_PORT
  );
}

export function dockerfileRepoPath(input: {
  buildPath?: string | null;
  dockerContextPath?: string | null;
  dockerfile?: string | null;
}): string {
  const build = (input.buildPath ?? "/").replace(/^\/+|\/+$/g, "");
  const context = (input.dockerContextPath ?? ".")
    .trim()
    .replace(/^\.\//, "")
    .replace(/^\/+|\/+$/g, "");
  const file = (input.dockerfile?.trim() || "Dockerfile").replace(/^\/+/, "");
  const contextPart = !context || context === "." ? "" : context;
  return [build, contextPart, file].filter(Boolean).join("/");
}
