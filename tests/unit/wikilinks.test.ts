import { describe, expect, it } from "vitest";
import { aggregateWikiLinks, normalizeWikiTarget, parseWikiLinks } from "@/domain/wikilinks/wikilinks";

describe("wikilinks", () => {
  it("normaliza acentos, caixa, espaços e extensão", () => {
    expect(normalizeWikiTarget("  Revolução   Haitiana.MD ")).toBe("revolucao haitiana");
  });

  it("extrai links simples e aliases preservando o alvo", () => {
    expect(parseWikiLinks("Veja [[Roma Antiga]] e [[Revolução Haitiana|Haiti]].")).toEqual([
      { targetText: "Roma Antiga", targetNormalized: "roma antiga", alias: null },
      { targetText: "Revolução Haitiana", targetNormalized: "revolucao haitiana", alias: "Haiti" },
    ]);
  });

  it("ignora fenced code blocks e inline code", () => {
    const markdown = "[[Válido]]\n```md\n[[Ignorado]]\n```\n`[[Também ignorado]]`";
    expect(parseWikiLinks(markdown).map((link) => link.targetText)).toEqual(["Válido"]);
  });

  it("agrega ocorrências iguais sem misturar aliases", () => {
    expect(aggregateWikiLinks("[[Roma]] [[Roma]] [[Roma|Império]]")).toEqual([
      { targetText: "Roma", targetNormalized: "roma", alias: null, occurrenceCount: 2 },
      { targetText: "Roma", targetNormalized: "roma", alias: "Império", occurrenceCount: 1 },
    ]);
  });
});
