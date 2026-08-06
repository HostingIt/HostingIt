import { z } from "zod";

export const envVarSchema = z.object({
  key: z.string().min(1).max(256),
  value: z.string().max(8192),
  secret: z.boolean().optional(),
});

export const envVarListSchema = z.array(envVarSchema);

export type EnvVarInput = z.infer<typeof envVarSchema>;
