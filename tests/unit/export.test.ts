import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildVaultZip } from "@/server/services/export/export-service";
import type { NoteRecord } from "@/domain/vault/types";

function note(path: string, contentMarkdown = "# Roma\n\nVeja [[República Romana]]."): NoteRecord {
  return { id: crypto.randomUUID(), vaultId: crypto.randomUUID(), path, title: "Roma", contentMarkdown, tags: [], createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), version: 1 };
}

describe("vault export", () => {
  it("gera ZIP com paths e Markdown canônicos", async () => {
    const buffer = await buildVaultZip([note("03 - Conhecimento/Roma.md")]);
    const zip = await JSZip.loadAsync(buffer);
    expect(await zip.file("03 - Conhecimento/Roma.md")?.async("string")).toBe("# Roma\n\nVeja [[República Romana]].");
  });

  it("rejeita traversal antes de criar o ZIP", async () => {
    await expect(buildVaultZip([note("../segredo.md")])).rejects.toThrow();
  });

  it("rejeita colisões perigosas que diferem apenas por caixa", async () => {
    await expect(buildVaultZip([note("Roma.md"), note("ROMA.md")])).rejects.toThrow("Colisão");
  });
});
