import type { EnvVar } from "@/lib/env-vars";
import type { EnvVarInput } from "@/lib/env-var-schema";

export const MASKED_ENV_VALUE = "••••••••";

const SENSITIVE_KEY =
  /(?:^|_)(?:secret|password|passwd|token|api[_-]?key|private[_-]?key|auth|credential|jwt|session)(?:_|$)/i;

export function isSensitiveEnvKey(key: string): boolean {
  const normalized = key.trim();
  if (!normalized) return false;
  return SENSITIVE_KEY.test(normalized);
}

export function shouldMaskEnvVar(key: string, secretFlag?: boolean): boolean {
  return Boolean(secretFlag) || isSensitiveEnvKey(key);
}

export function maskEnvVarValue(value: string): string {
  return value.length > 0 ? MASKED_ENV_VALUE : "";
}

export function isMaskedEnvValue(value: string): boolean {
  return value === MASKED_ENV_VALUE;
}

export type EnvVarResponse = EnvVar & {
  secret: boolean;
  masked?: boolean;
};

export function toMaskedEnvResponse(
  rows: EnvVar[],
  options: { forceSecret?: boolean } = {}
): EnvVarResponse[] {
  return rows.map((row) => {
    const secret = shouldMaskEnvVar(row.key, options.forceSecret);
    if (secret && row.value) {
      return {
        ...row,
        value: maskEnvVarValue(row.value),
        secret: true,
        masked: true,
      };
    }
    return { ...row, secret: secret || false };
  });
}

/** Preserve existing values when the client submits masked placeholders. */
export function mergeEnvVarUpdates(
  incoming: EnvVarInput[],
  existing: EnvVar[]
): EnvVar[] {
  const existingByKey = new Map(existing.map((row) => [row.key, row.value]));

  return incoming
    .filter((row) => row.key.trim().length > 0)
    .map((row) => {
      const key = row.key.trim();
      if (isMaskedEnvValue(row.value)) {
        return { key, value: existingByKey.get(key) ?? "" };
      }
      return { key, value: row.value };
    });
}
