import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  AI_PROVIDER: z.enum(["fake", "external"]).default("fake"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://sinapse:sinapse@localhost:5432/sinapse",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "development-only-secret-change-me-123456",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    AI_PROVIDER: process.env.AI_PROVIDER ?? "fake",
  });
}
