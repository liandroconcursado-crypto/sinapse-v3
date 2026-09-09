import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { RequestContext } from "@/domain/vault/types";
import { IngestionService } from "@/server/services/ingestion/ingestion-service";
import { MemoryService } from "@/server/services/memory/memory-service";

const readAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

function response<T extends Record<string, unknown>>(output: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output) }],
    structuredContent: output,
  };
}

export function createSinapseMcpServer(context: RequestContext): McpServer {
  const server = new McpServer({ name: "SINAPSE", version: "0.1.0" });
  const memory = new MemoryService();
  const ingestion = new IngestionService();

  server.registerTool("search", {
    title: "Buscar no cérebro",
    description: "Use esta ferramenta quando precisar localizar notas, fatos, decisões, projetos ou fontes já armazenados no SINAPSE do usuário.",
    inputSchema: z.object({
      query: z.string().trim().min(1).max(500),
      folder: z.string().trim().min(1).max(240).optional(),
      tag: z.string().trim().min(1).max(80).optional(),
      limit: z.number().int().min(1).max(20).default(8),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        id: z.string(), path: z.string(), title: z.string(), tags: z.array(z.string()), updatedAt: z.string(), snippet: z.string(), score: z.number(),
      })),
    }),
    annotations: readAnnotations,
  }, async (input) => response({ results: await memory.search(context, input) }));

  server.registerTool("fetch", {
    title: "Abrir memória",
    description: "Use esta ferramenta quando precisar ler o Markdown completo de uma nota específica e suas conexões de entrada e saída.",
    inputSchema: z.object({ noteId: z.string().uuid() }),
    outputSchema: z.object({
      note: z.object({
        id: z.string(), path: z.string(), title: z.string(), markdown: z.string(), tags: z.array(z.string()), updatedAt: z.string(),
        outgoing: z.array(z.object({ targetNoteId: z.string().nullable(), targetText: z.string(), kind: z.string() })),
        backlinks: z.array(z.object({ sourceNoteId: z.string(), sourceTitle: z.string(), sourcePath: z.string(), kind: z.string() })),
      }),
    }),
    annotations: readAnnotations,
  }, async ({ noteId }) => {
    const note = await memory.fetch(context, noteId);
    return response({ note: {
      id: note.id,
      path: note.path,
      title: note.title,
      markdown: note.contentMarkdown,
      tags: note.tags,
      updatedAt: note.updatedAt,
      outgoing: note.outgoing.map((link) => ({ targetNoteId: link.targetNoteId, targetText: link.targetText, kind: link.kind })),
      backlinks: note.backlinks.map(({ source, link }) => ({ sourceNoteId: source.id, sourceTitle: source.title, sourcePath: source.path, kind: link.kind })),
    } });
  });

  server.registerTool("get_context", {
    title: "Recuperar contexto",
    description: "Use esta ferramenta antes de responder ou planejar quando o histórico pessoal, um projeto ou decisões anteriores do usuário puderem mudar a resposta.",
    inputSchema: z.object({
      intent: z.string().trim().min(1).max(500),
      project: z.string().trim().min(1).max(200).optional(),
      limit: z.number().int().min(1).max(20).default(8),
    }),
    outputSchema: z.object({
      memories: z.array(z.object({
        id: z.string(), path: z.string(), title: z.string(), tags: z.array(z.string()), updatedAt: z.string(), snippet: z.string(), score: z.number(),
      })),
    }),
    annotations: readAnnotations,
  }, async (input) => response({ memories: await memory.getContext(context, input) }));

  server.registerTool("capture_memory", {
    title: "Guardar e conectar memória",
    description: "Use esta ferramenta quando o usuário pedir para guardar texto, conhecimento, decisões, ideias ou um fechamento de conversa no SINAPSE. Ela organiza em Markdown e cria conexões conservadoras.",
    inputSchema: z.object({
      text: z.string().trim().min(1).max(500_000),
      sourceName: z.string().trim().min(1).max(240).default("Conversa no ChatGPT"),
      mode: z.enum(["build", "expand"]).default("expand"),
      autoApply: z.boolean().default(true).describe("Quando falso, apenas prepara uma proposta para revisão."),
    }),
    outputSchema: z.object({
      ingestionId: z.string(), status: z.string(), appliedNoteIds: z.array(z.string()),
      proposedNotes: z.array(z.object({ temporaryId: z.string(), title: z.string(), operation: z.string(), epistemicStatus: z.string() })),
      warnings: z.array(z.string()),
    }),
    annotations: writeAnnotations,
  }, async (input) => {
    const vaultId = await memory.ensureVault(context);
    const job = await ingestion.createProposal(context, { ...input, vaultId });
    return response({
      ingestionId: job.ingestionId,
      status: job.status,
      appliedNoteIds: job.commitResult?.noteIds ?? [],
      proposedNotes: (job.proposal?.notes ?? []).map((note) => ({ temporaryId: note.temporaryId, title: note.title, operation: note.operation, epistemicStatus: note.epistemicStatus })),
      warnings: job.proposal?.warnings ?? [],
    });
  });

  server.registerTool("commit_memory_update", {
    title: "Confirmar atualização de memória",
    description: "Use esta ferramenta somente quando o usuário confirmar quais notas de uma proposta pendente devem ser gravadas no vault.",
    inputSchema: z.object({
      ingestionId: z.string().uuid(),
      selectedTemporaryIds: z.array(z.string().min(1).max(100)).min(1).max(100),
    }),
    outputSchema: z.object({ ingestionId: z.string(), status: z.string(), appliedNoteIds: z.array(z.string()) }),
    annotations: writeAnnotations,
  }, async ({ ingestionId, selectedTemporaryIds }) => {
    const job = await ingestion.commit(context, ingestionId, { selectedTemporaryIds });
    return response({ ingestionId: job.ingestionId, status: job.status, appliedNoteIds: job.commitResult?.noteIds ?? [] });
  });

  return server;
}
