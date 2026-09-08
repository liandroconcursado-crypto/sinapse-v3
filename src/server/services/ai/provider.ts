import type { AIProvider } from "./ai-provider";
import { FakeAIProvider } from "./fake-ai-provider";
import { readServerEnv } from "@/server/env";

export function createAIProvider(): AIProvider {
  const env = readServerEnv();
  if (env.AI_PROVIDER === "fake") return new FakeAIProvider();
  throw new Error("Provider externo ainda não configurado. Use AI_PROVIDER=fake.");
}
