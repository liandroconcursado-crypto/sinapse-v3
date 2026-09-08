import { describe, expect, it } from "vitest";
import { normalizeVaultPath } from "@/domain/vault/path";

describe("vault paths", () => {
  it("normaliza separadores para POSIX", () => {
    expect(normalizeVaultPath("03 - Conhecimento\\Roma.md")).toBe("03 - Conhecimento/Roma.md");
  });

  it.each(["../fora.md", "/absoluto.md", "C:\\segredo.md", "pasta//nota.md", "nota.txt", "nota\0.md"])("rejeita path inseguro %s", (path) => {
    expect(() => normalizeVaultPath(path)).toThrow();
  });
});
