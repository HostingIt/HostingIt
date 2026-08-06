export type EnvVar = { key: string; value: string };

export function parseEnvString(raw: string | null | undefined): EnvVar[] {
  if (!raw?.trim()) return [];

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const eq = line.indexOf("=");
      if (eq === -1) return { key: line, value: "" };
      return {
        key: line.slice(0, eq).trim(),
        value: line.slice(eq + 1),
      };
    })
    .filter((entry) => entry.key.length > 0);
}

export function serializeEnvVars(vars: EnvVar[]): string {
  return vars
    .filter((entry) => entry.key.trim().length > 0)
    .map((entry) => `${entry.key.trim()}=${entry.value}`)
    .join("\n");
}
