import { headers } from "next/headers";
import { auth } from "./auth";
import type { RequestContext } from "@/domain/vault/types";

export class AuthenticationError extends Error {
  constructor() {
    super("Autenticação necessária.");
    this.name = "AuthenticationError";
  }
}

export async function getRequestContext(): Promise<RequestContext> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new AuthenticationError();
  return { userId: session.user.id };
}
