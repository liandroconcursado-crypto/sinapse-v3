import { describe, expect, it } from "vitest";
import type { NoteRecord } from "@/domain/vault/types";
import { MemoryService } from "@/server/services/memory/memory-service";

const notes: NoteRecord[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    vaultId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    path: "00 - Sistema/Contexto Mestre.md",
    title: "Contexto Mestre",
    contentMarkdown: "Liandro prefere respostas objetivas.",
    tags: ["contexto"], createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", version: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    vaultId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    path: "01 - Projetos/SINAPSE.md",
    title: "SINAPSE",
    contentMarkdown: "O projeto usa Markdown e um grafo de conhecimento.",
    tags: ["projeto"], createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", version: 1,
  },
];

const repository = {
  ensureDefaultVault: async () => notes[0].vaultId,
  listNotes: async () => notes,
  getNote: async () => ({ ...notes[1], outgoing: [], backlinks: [] }),
};

describe("MemoryService", () => {
  it("ranks matching memories and keeps Contexto Mestre in recovered context", async () => {
    const service = new MemoryService(repository);
    const results = await service.search({ userId: "user-1" }, { query: "grafo Markdown" });
    expect(results[0]?.title).toBe("SINAPSE");

    const context = await service.getContext({ userId: "user-1" }, { intent: "continuar o projeto SINAPSE" });
    expect(context.map((note) => note.title)).toEqual(["Contexto Mestre", "SINAPSE"]);
  });
});
