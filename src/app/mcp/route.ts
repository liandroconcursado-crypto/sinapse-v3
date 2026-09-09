import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { z } from "zod";
import { auth, mcpResource } from "@/server/auth/auth";
import { createSinapseMcpServer } from "@/server/mcp/server";

export const runtime = "nodejs";

const protectedHandler = requireMcpAuth(auth, async (request, claims) => {
  const userId = z.string().min(1).parse(claims.sub);
  const handler = createMcpHandler(() => createSinapseMcpServer({ userId }), { legacy: "reject" });
  return handler.fetch(request);
}, {
  resource: mcpResource,
  requiredScopes: ["sinapse:memory"],
});

export const GET = protectedHandler;
export const POST = protectedHandler;
export const DELETE = protectedHandler;
