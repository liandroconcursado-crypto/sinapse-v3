import { hashText } from "@/domain/ingestion/chunking";
import { ingestionProposalSchema, type NoteKind, type ProposedNote } from "@/domain/ingestion/schema";
import { normalizeWikiTarget } from "@/domain/wikilinks/wikilinks";
import type { AIProvider, ChunkExtraction, ExtractedObservation } from "./ai-provider";

type Rule = Omit<ExtractedObservation, "excerpt"> & { pattern: RegExp };

const rules: Rule[] = [
  { key: "area-ensino", title: "Ensino de História", kind: "area", epistemicStatus: "explicit", summary: "Área profissional dedicada ao ensino de História no ensino médio.", pattern: /professor de História no ensino médio/i },
  { key: "roma", title: "Roma Antiga", kind: "knowledge", epistemicStatus: "explicit", summary: "Tema de aula que deve conectar República Romana, crise republicana e Império.", pattern: /República Romana, crise republicana e Império/i },
  { key: "revolucao-francesa", title: "Revolução Francesa", kind: "knowledge", epistemicStatus: "explicit", summary: "Tema central desejado para navegar entre aulas, fontes, atividades e conexões históricas.", pattern: /Revolução Francesa/i },
  { key: "revolucao-haitiana", title: "Revolução Haitiana", kind: "knowledge", epistemicStatus: "explicit", summary: "Tema relacionado à Revolução Francesa e ao Haiti no mapa de conhecimento desejado.", pattern: /Haiti/i },
  { key: "melhorar-aulas-roma", title: "Melhorar aulas sobre Roma", kind: "project", epistemicStatus: "explicit", summary: "Projeto para reduzir a dependência de exposição oral e slides nas aulas sobre Roma.", pattern: /Quero melhorar as aulas sobre Roma/i },
  { key: "canal-historia-contexto", title: "História em Contexto", kind: "project", epistemicStatus: "suggested", summary: "Possível canal futuro de vídeos curtos, ainda sem prioridade ou compromisso.", pattern: /ideia futura, ainda sem prioridade, é criar um canal de vídeos curtos chamado “História em Contexto”/i },
  { key: "decisao-reduzir-slides", title: "Reduzir dependência de slides", kind: "decision", epistemicStatus: "explicit", summary: "Direção explicitamente desejada para melhorar as aulas sobre Roma.", pattern: /hoje muito baseadas em exposição oral e slides/i },
  { key: "acao-organizar-fontes", title: "Organizar materiais de História", kind: "action", epistemicStatus: "explicit", summary: "Reunir o material hoje espalhado entre Drive, PDFs, celular, links e conversas com IA.", pattern: /material espalhado entre Google Drive, PDFs, anotações no celular, links e conversas com IA/i },
  { key: "fonte-acervo-disperso", title: "Acervo disperso de História", kind: "source", epistemicStatus: "explicit", summary: "Conjunto de materiais existentes em Google Drive, PDFs, anotações, links e conversas com IA, ainda sem catálogo único.", pattern: /material espalhado entre Google Drive, PDFs, anotações no celular, links e conversas com IA/i },
  { key: "interesses", title: "Interesses em História", kind: "context", epistemicStatus: "explicit", summary: "Interesses incluem acontecimentos atuais, História do Brasil, Estados nacionais e outros temas históricos.", pattern: /história do Brasil.*questões atuais/is },
];

function excerptAround(text: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 40);
  return text.slice(start, Math.min(text.length, match.index + match[0].length + 80)).replace(/\s+/g, " ").trim().slice(0, 320);
}

export class FakeAIProvider implements AIProvider {
  readonly name = "fake";

  async extractChunk({ chunk }: Parameters<AIProvider["extractChunk"]>[0]): Promise<ChunkExtraction> {
    const observations: ExtractedObservation[] = [];
    for (const rule of rules) {
      const match = rule.pattern.exec(chunk.text);
      rule.pattern.lastIndex = 0;
      if (match) {
        observations.push({
          key: rule.key,
          kind: rule.kind,
          title: rule.title,
          epistemicStatus: rule.epistemicStatus,
          summary: rule.summary,
          excerpt: excerptAround(chunk.text, match),
        });
      }
    }
    if (observations.length === 0) {
      const heading = /^#\s+(.+)$/m.exec(chunk.text)?.[1]?.trim();
      const firstSentence = chunk.text.split(/(?<=[.!?])\s+/)[0]?.trim().slice(0, 500);
      if (firstSentence) {
        observations.push({
          key: `knowledge-${chunk.hash.slice(0, 12)}`,
          title: heading?.slice(0, 160) || `Entrada ${chunk.index + 1}`,
          kind: "knowledge",
          epistemicStatus: "explicit",
          summary: firstSentence,
          excerpt: firstSentence.slice(0, 320),
        });
      }
    }
    return { chunkId: chunk.id, observations, warnings: [] };
  }

  async mergeExtractions({ extractions, vaultIndex, inputSummary }: Parameters<AIProvider["mergeExtractions"]>[0]) {
    const observations = new Map<string, { observation: ExtractedObservation; chunkId: string }>();
    for (const extraction of extractions) {
      for (const observation of extraction.observations) {
        if (!observations.has(observation.key)) observations.set(observation.key, { observation, chunkId: extraction.chunkId });
      }
    }

    const notes: ProposedNote[] = [...observations.values()].map(({ observation, chunkId }) => {
      const normalized = normalizeWikiTarget(observation.title);
      const matches = vaultIndex.filter((note) => note.normalizedTitle === normalized);
      const operation = matches.length === 1 ? "update" : matches.length > 1 ? "possible_duplicate" : "create";
      const path = matches.length === 1 ? matches[0].path : `${folderFor(observation.kind)}/${safeName(observation.title)}.md`;
      return {
        temporaryId: `${observation.key}-${hashText(observation.summary).slice(0, 8)}`,
        operation,
        proposedPath: path,
        title: observation.title,
        kind: observation.kind,
        epistemicStatus: observation.epistemicStatus,
        summary: observation.summary,
        markdownSections: [{ heading: "Síntese", body: observation.summary, mode: "append" }],
        tags: [observation.kind, observation.epistemicStatus],
        links: linksFor(observation.key, observations),
        evidence: observation.epistemicStatus === "suggested" ? [] : [{ chunkId, excerpt: observation.excerpt }],
        confidence: observation.epistemicStatus === "suggested" ? 0.55 : 0.92,
      };
    });

    return ingestionProposalSchema.parse({
      schemaVersion: 1,
      inputSummary,
      notes,
      warnings: notes.some((note) => note.epistemicStatus === "suggested")
        ? ["Possibilidades futuras permanecem marcadas como sugestões, não como compromissos."]
        : [],
      unresolved: notes.filter((note) => note.operation === "possible_duplicate").map((note) => ({
        label: note.title,
        reason: "Há mais de uma nota com o mesmo título normalizado; nenhuma atualização foi escolhida automaticamente.",
      })),
    });
  }

  async answerFromVault({ question, notes }: Parameters<AIProvider["answerFromVault"]>[0]) {
    const terms = new Set(normalizeWikiTarget(question).split(" ").filter((term) => term.length > 3));
    const matching = notes.filter((note) => [...terms].some((term) => normalizeWikiTarget(`${note.title} ${note.contentMarkdown}`).includes(term))).slice(0, 5);
    return {
      answer: matching.length ? `Encontrei contexto em: ${matching.map((note) => note.title).join(", ")}.` : "Não encontrei evidência suficiente no vault.",
      sourceNoteIds: matching.map((note) => note.id),
    };
  }
}

function folderFor(kind: NoteKind): string {
  return ({
    context: "00 - Contexto",
    project: "01 - Projetos",
    area: "02 - Áreas",
    knowledge: "03 - Conhecimento",
    source: "04 - Fontes",
    decision: "05 - Decisões",
    action: "06 - Ações",
    journal: "07 - Diário",
    system: "99 - Sistema",
  })[kind];
}

function safeName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function linksFor(key: string, observations: Map<string, { observation: ExtractedObservation; chunkId: string }>) {
  if (key !== "revolucao-francesa") return [];
  return ["revolucao-haitiana", "interesses"].flatMap((targetKey) => {
    const target = observations.get(targetKey)?.observation;
    return target ? [{ targetTitle: target.title, reason: "Relação explicitamente mencionada no relato.", epistemicStatus: "explicit" as const }] : [];
  });
}
