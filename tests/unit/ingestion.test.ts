import { describe, expect, it } from "vitest";
import { chunkText, normalizeIngestionText } from "@/domain/ingestion/chunking";
import { ingestionProposalSchema } from "@/domain/ingestion/schema";
import { renderProposedMarkdown } from "@/domain/ingestion/render";
import { LocalMemoryProvider } from "@/server/services/ai/local-memory-provider";
import { parseKnowledgeFile } from "@/domain/ingestion/chat-export";

describe("ingestion domain", () => {
  it("divide 200 mil caracteres em chunks determinísticos e limitados", () => {
    const text = Array.from({ length: 2_500 }, (_, index) => `Parágrafo ${index}: ${"conteúdo ".repeat(8)}`).join("\n\n").slice(0, 200_000);
    const first = chunkText(text, 4_000);
    const second = chunkText(text, 4_000);
    expect(first.length).toBeGreaterThan(1);
    expect(first.every((chunk) => chunk.text.length <= 4_000)).toBe(true);
    expect(first.map((chunk) => chunk.id)).toEqual(second.map((chunk) => chunk.id));
    expect(normalizeIngestionText(text).length).toBeGreaterThan(100_000);
  });

  it("rejeita decisão inferida e nota factual sem evidência", () => {
    const invalid = {
      schemaVersion: 1,
      inputSummary: "Entrada",
      notes: [{
        temporaryId: "x",
        operation: "create",
        proposedPath: "05 - Decisões/X.md",
        title: "X",
        kind: "decision",
        epistemicStatus: "inferred",
        summary: "Suposta decisão.",
        markdownSections: [{ heading: "Síntese", body: "Suposta decisão.", mode: "append" }],
        tags: [], links: [], evidence: [], confidence: 0.5,
      }],
      warnings: [], unresolved: [],
    };
    expect(ingestionProposalSchema.safeParse(invalid).success).toBe(false);
  });

  it("preserva texto manual ao expandir uma nota", () => {
    const proposal = ingestionProposalSchema.parse({
      schemaVersion: 1, inputSummary: "Entrada", warnings: [], unresolved: [],
      notes: [{
        temporaryId: "roma", operation: "update", proposedPath: "Roma.md", title: "Roma", kind: "knowledge",
        epistemicStatus: "explicit", summary: "Nova síntese.", tags: [], links: [], confidence: 1,
        evidence: [{ chunkId: "chunk-1", excerpt: "Roma foi citada." }],
        markdownSections: [{ heading: "Síntese", body: "Nova síntese.", mode: "append" }],
      }],
    }).notes[0];
    expect(renderProposedMarkdown(proposal, "# Roma\n\nTexto manual importante.")).toContain("Texto manual importante.");
    expect(renderProposedMarkdown(proposal, "# Roma\n\nTexto manual importante.")).toContain("Nova síntese.");
  });

  it("motor local generaliza projetos, contexto, decisões e ações sem fixture específica", async () => {
    const text = "Eu sou pesquisadora em biologia. Estou desenvolvendo um projeto sobre manguezais. Decidi usar dados públicos porque preciso revisar a coleta. Meu próximo passo é verificar as séries históricas.";
    const provider = new LocalMemoryProvider();
    const extractions = await Promise.all(chunkText(text, 4_000).map((chunk) => provider.extractChunk({ chunk })));
    const proposal = await provider.mergeExtractions({ extractions, vaultIndex: [], inputSummary: text, sourceName: "Conversa", mode: "build" });
    expect(proposal.notes.map((note) => note.kind)).toEqual(
      expect.arrayContaining(["context", "project", "decision", "action", "journal", "system"]),
    );
    expect(proposal.notes.find((note) => note.kind === "decision")?.epistemicStatus).toBe("explicit");
    expect(proposal.notes.every((note) => note.epistemicStatus === "suggested" || note.evidence.length > 0)).toBe(true);
  });

  it("transforma uma exportação do ChatGPT em conversa legível", () => {
    const exported = JSON.stringify([{ title: "Projeto Manguezal", mapping: {
      a: { message: { author: { role: "user" }, content: { parts: ["Quero retomar o projeto."] }, create_time: 1 } },
      b: { message: { author: { role: "assistant" }, content: { parts: ["Vamos localizar as fontes."] }, create_time: 2 } },
    } }]);
    const parsed = parseKnowledgeFile("conversations.json", exported);
    expect(parsed.text).toContain("# Conversa · Projeto Manguezal");
    expect(parsed.text).toContain("**Usuário:** Quero retomar o projeto.");
    expect(parsed.notice).toContain("1 conversas");
  });
});
