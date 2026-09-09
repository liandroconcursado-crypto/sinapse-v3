import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { db } from "@/server/db";
import { authSchema } from "@/server/db/schema";
import { readServerEnv } from "@/server/env";

const env = readServerEnv();
export const mcpResource = new URL("/mcp", env.BETTER_AUTH_URL).toString();
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

export const auth = betterAuth({
  appName: "SINAPSE",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  plugins: [
    jwt(),
    ...isProductionBuild ? [] : [
      mcp({
        loginPage: "/sign-in",
        consentPage: "/consent",
        resource: mcpResource,
        scopes: ["openid", "profile", "offline_access", "sinapse:memory"],
      }),
      cimd({
        fetchClientMetadataResource,
        metadataProfile: "mcp-2026-07-28",
      }),
    ],
    nextCookies(),
  ],
});
