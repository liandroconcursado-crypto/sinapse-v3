import type { AIProvider } from "./ai-provider";
import { LocalMemoryProvider } from "./local-memory-provider";
import { readServerEnv } from "@/server/env";

export function createAIProvider(): AIProvider {
  const env = readServerEnv();
  if (env.AI_PROVIDER === "local" || env.AI_PROVIDER === "fake") return new LocalMemoryProvider();
  throw new Error("Provider externo ainda não configurado. Use AI_PROVIDER=local.");
}
