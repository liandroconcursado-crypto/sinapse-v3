import { ZodError } from "zod";
import { AuthenticationError } from "@/server/auth/context";
import { NoteConflictError, NoteNotFoundError, VaultNotFoundError } from "@/server/repositories/vault-repository";

export function apiError(error: unknown): Response {
  if (error instanceof AuthenticationError) return Response.json({ error: error.message }, { status: 401 });
  if (error instanceof NoteConflictError) return Response.json({ error: error.message, code: "VERSION_CONFLICT" }, { status: 409 });
  if (error instanceof NoteNotFoundError || error instanceof VaultNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ZodError) return Response.json({ error: "Entrada inválida.", issues: error.issues }, { status: 400 });
  console.error("request_failed", { name: error instanceof Error ? error.name : "UnknownError" });
  return Response.json({ error: "Não foi possível concluir a operação." }, { status: 500 });
}
