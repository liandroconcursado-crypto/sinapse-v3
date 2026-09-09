import { hashText } from "@/domain/ingestion/chunking";
import { ingestionProposalSchema, type NoteKind, type ProposedNote } from "@/domain/ingestion/schema";
import { normalizeWikiTarget } from "@/domain/wikilinks/wikilinks";
import type { AIProvider, ChunkExtraction, ExtractedObservation, VaultIndexEntry } from "./ai-provider";

const CLASSIFIERS: Array<{ kind: NoteKind; pattern: RegExp }> = [
  { kind: "decision", pattern: /\b(decidi|decidimos|escolhi|escolhemos|fica decidido|ficou decidido|a decis[aã]o (?:é|foi)|vamos (?:usar|fazer|adotar|seguir))\b/i },
  { kind: "action", pattern: /\b(preciso|precisamos|tenho que|temos que|devo|devemos|vou (?:fazer|criar|verificar|enviar|terminar|revisar)|pr[oó]xim[ao] (?:a[cç][aã]o|passo)|pendente)\b/i },
  { kind: "project", pattern: /\b(projeto|estou (?:criando|construindo|desenvolvendo|fazendo)|estamos (?:criando|construindo|desenvolvendo)|quero (?:criar|construir|desenvolver|lan[cç]ar)|objetivo (?:é|do projeto))\b/i },
  { kind: "context", pattern: /\b(meu nome|eu sou|sou |trabalho (?:como|com|em)|estudo |moro |vivo |prefiro |gosto |n[aã]o gosto|[ée] importante para mim|minha prioridade)\b/i },
];

const SPEAKER_PREFIX = /^(?:[-*>#\s]*)(?:usu[aá]rio|user|human|eu|assistant|assistente|chatgpt|ia)\s*[:：-]\s*/i;
const MARKDOWN_NOISE = /[*_`>#]/g;

function statements(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÜ])/u)
    .map((value) => value.replace(SPEAKER_PREFIX, "").replace(/^[-*]\s+/, "").trim())
    .filter((value) => value.length >= 18 && value.length <= 1_500);
}

function cleanTitle(value: string): string {
  const cleaned = value
    .replace(SPEAKER_PREFIX, "")
    .replace(MARKDOWN_NOISE, "")
    .replace(/\b(porque|pois|para que|com o objetivo de)\b[\s\S]*$/i, "")
    .replace(/^(?:eu\s+)?(?:decidi(?:mos)?|escolhi(?:mos)?|preciso(?:amos)?|tenho que|temos que|devo|devemos|vou|vamos|quero|queremos|estou|estamos)\s+/i, "")
    .replace(/[.:;,-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").slice(0, 12).join(" ");
  const title = words.length > 100 ? `${words.slice(0, 97).trim()}…` : words;
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : "Memória importada";
}

function makeObservation(kind: NoteKind, summary: string, excerpt = summary): ExtractedObservation {
  const title = kind === "context" ? "Contexto Mestre" : cleanTitle(summary);
  return {
    key: kind === "context" ? "context-master" : `${kind}-${hashText(`${title}\n${summary}`).slice(0, 16)}`,
    title,
    kind,
    epistemicStatus: "explicit",
    summary: summary.slice(0, 2_000),
    excerpt: excerpt.slice(0, 320),
  };
}

function headingObservations(text: string): ExtractedObservation[] {
  const headings = [...text.matchAll(/^#{1,3}\s+(.{3,120})$/gm)]
    .map((match) => match[1].trim())
    .filter((title) => !/^(user|assistant|usu[aá]rio|chatgpt)$/i.test(title));
  return headings.slice(0, 6).map((title) => makeObservation("knowledge", title));
}

function sourceObservations(text: string): ExtractedObservation[] {
  const urls = [...new Set(text.match(/https?:\/\/[^\s)\]>]+/g) ?? [])].slice(0, 8);
  return urls.map((url) => makeObservation("source", `Fonte mencionada: ${url}`, url));
}

function mergeContext(observations: ExtractedObservation[]): ExtractedObservation[] {
  const contexts = observations.filter((item) => item.kind === "context");
  const others = observations.filter((item) => item.kind !== "context");
  if (!contexts.length) return others;
  const unique = [...new Set(contexts.map((item) => item.summary))];
  return [makeObservation("context", unique.join("\n\n"), unique[0]), ...others];
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeWikiTarget(value).split(/\s+/).filter((token) => token.length > 3));
}

function similarity(left: string, right: string): number {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / (a.size + b.size - intersection);
}

function operationFor(title: string, vaultIndex: VaultIndexEntry[]) {
  const normalized = normalizeWikiTarget(title);
  const exact = vaultIndex.filter((note) => note.normalizedTitle === normalized);
  if (exact.length === 1) return { operation: "update" as const, path: exact[0].path };
  if (exact.length > 1) return { operation: "possible_duplicate" as const };
  const similar = vaultIndex.filter((note) => similarity(title, note.title) >= 0.72);
  return similar.length ? { operation: "possible_duplicate" as const } : { operation: "create" as const };
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
    journal: "07 - Memória episódica",
    system: "99 - Sistema",
  })[kind];
}

function safeName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 160);
}

function relationReason(source: ProposedNote, target: ProposedNote): string {
  if (source.kind === "action" && target.kind === "project") return "depende do projeto identificado na mesma memória";
  if (source.kind === "decision" && target.kind === "project") return "orienta o projeto identificado na mesma memória";
  if (source.kind === "source") return "documenta conhecimento extraído da mesma origem";
  if (target.kind === "context") return "pertence ao contexto informado pela pessoa";
  return "conexão contextual encontrada na mesma entrada";
}

function addMeaningfulLinks(notes: ProposedNote[]): ProposedNote[] {
  const linkable = notes.filter((note) => note.kind !== "system" && note.kind !== "journal");
  return notes.map((note) => {
    if (note.kind === "context" || note.kind === "system") return note;
    const candidates = linkable
      .filter((target) => target.temporaryId !== note.temporaryId)
      .map((target) => ({ target, score: similarity(note.summary, target.summary) + (target.kind === "project" ? 0.25 : 0) + (target.kind === "context" ? 0.15 : 0) }))
      .filter(({ score }) => score >= 0.18)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return {
      ...note,
      links: candidates.map(({ target }) => ({
        targetTitle: target.title,
        reason: relationReason(note, target),
        epistemicStatus: "inferred" as const,
      })),
    };
  });
}

function systemNotes(existing: VaultIndexEntry[]): ProposedNote[] {
  const definitions = [
    {
      title: "SINAPSE",
      path: "99 - Sistema/SINAPSE.md",
      body: "Este vault é uma memória conectada. Informação explícita, inferência e sugestão permanecem separadas. Antes de criar, procure o nó canônico; ao atualizar, preserve histórico, fonte, data e incerteza.",
    },
    {
      title: "ROTINAS",
      path: "99 - Sistema/ROTINAS.md",
      body: "Use /briefing, /brain, /project, /study, /research, /decision, /source, /idea, /next, /end e /review para recuperar, gravar e revisar conhecimento com contexto.",
    },
  ];
  return definitions.map((definition) => {
    const match = existing.find((note) => note.normalizedTitle === normalizeWikiTarget(definition.title));
    return {
      temporaryId: `system-${normalizeWikiTarget(definition.title)}`,
      operation: match ? "update" as const : "create" as const,
      proposedPath: match?.path ?? definition.path,
      title: definition.title,
      kind: "system" as const,
      epistemicStatus: "suggested" as const,
      summary: definition.body,
      markdownSections: [{ heading: "Protocolo", body: definition.body, mode: "replace_managed" as const }],
      tags: ["sistema"],
      links: [],
      evidence: [],
      confidence: 1,
    };
  });
}

export class LocalMemoryProvider implements AIProvider {
  readonly name = "local-memory";

  async extractChunk({ chunk }: Parameters<AIProvider["extractChunk"]>[0]): Promise<ChunkExtraction> {
    const found: ExtractedObservation[] = [];
    for (const statement of statements(chunk.text)) {
      const classifier = CLASSIFIERS.find(({ pattern }) => pattern.test(statement));
      if (classifier) found.push(makeObservation(classifier.kind, statement));
      if (found.length >= 18) break;
    }
    found.push(...sourceObservations(chunk.text), ...headingObservations(chunk.text));
    if (!found.length) {
      const first = statements(chunk.text)[0] ?? chunk.text.trim().slice(0, 1_500);
      if (first) found.push(makeObservation("knowledge", first));
    }
    const deduplicated = new Map<string, ExtractedObservation>();
    for (const observation of mergeContext(found)) deduplicated.set(observation.key, observation);
    return { chunkId: chunk.id, observations: [...deduplicated.values()], warnings: [] };
  }

  async mergeExtractions({ extractions, vaultIndex, inputSummary, sourceName, mode }: Parameters<AIProvider["mergeExtractions"]>[0]) {
    const observations = new Map<string, { observation: ExtractedObservation; chunkId: string }>();
    for (const extraction of extractions) {
      for (const observation of extraction.observations) {
        const current = observations.get(observation.key);
        if (!current) observations.set(observation.key, { observation, chunkId: extraction.chunkId });
        else if (observation.kind === "context" && !current.observation.summary.includes(observation.summary)) {
          observations.set(observation.key, {
            chunkId: current.chunkId,
            observation: { ...current.observation, summary: `${current.observation.summary}\n\n${observation.summary}`.slice(0, 2_000) },
          });
        }
      }
    }

    let notes: ProposedNote[] = [...observations.values()].slice(0, 80).map(({ observation, chunkId }) => {
      const resolved = operationFor(observation.title, vaultIndex);
      const path = resolved.path ?? (observation.kind === "context"
        ? "00 - Contexto/Contexto Mestre.md"
        : `${folderFor(observation.kind)}/${safeName(observation.title)}.md`);
      return {
        temporaryId: `${observation.key}-${hashText(observation.summary).slice(0, 8)}`,
        operation: resolved.operation,
        proposedPath: path,
        title: observation.title,
        kind: observation.kind,
        epistemicStatus: observation.epistemicStatus,
        summary: observation.summary,
        markdownSections: [{
          heading: observation.kind === "context" ? "Contexto confirmado" : "Memória",
          body: observation.summary,
          mode: observation.kind === "context" ? "replace_managed" as const : "append" as const,
        }],
        tags: [observation.kind, observation.epistemicStatus],
        links: [],
        evidence: [{ chunkId, excerpt: observation.excerpt }],
        confidence: 0.86,
      };
    });

    const episodeTitle = `Importação · ${safeName(sourceName)}`;
    const episodeOperation = operationFor(episodeTitle, vaultIndex);
    const episode: ProposedNote = {
      temporaryId: `episode-${hashText(`${sourceName}\n${inputSummary}`).slice(0, 16)}`,
      operation: episodeOperation.operation,
      proposedPath: episodeOperation.path ?? `07 - Memória episódica/${episodeTitle}.md`,
      title: episodeTitle,
      kind: "journal",
      epistemicStatus: "explicit",
      summary: `Material recebido de “${sourceName}” e organizado em ${notes.length} memórias.` ,
      markdownSections: [{ heading: "Registro da ingestão", body: inputSummary, mode: "append" }],
      tags: ["memoria-episodica", "ingestao"],
      links: notes.slice(0, 12).map((note) => ({ targetTitle: note.title, reason: "memória criada ou atualizada nesta ingestão", epistemicStatus: "explicit" as const })),
      evidence: [{ chunkId: extractions[0]?.chunkId ?? "input", excerpt: inputSummary.slice(0, 320) }],
      confidence: 1,
    };
    notes = addMeaningfulLinks([...notes, episode]);
    if (mode === "build") notes.push(...systemNotes(vaultIndex));

    return ingestionProposalSchema.parse({
      schemaVersion: 1,
      inputSummary,
      notes,
      warnings: ["O motor local não usa uma API paga. Relações inferidas permanecem identificadas como inferências e podem ser refinadas pelo ChatGPT conectado."],
      unresolved: notes.filter((note) => note.operation === "possible_duplicate").map((note) => ({
        label: note.title,
        reason: "Foi encontrada uma memória semelhante; o motor preservou ambas até haver desambiguação.",
      })),
    });
  }

  async answerFromVault({ question, notes }: Parameters<AIProvider["answerFromVault"]>[0]) {
    const query = tokenSet(question);
    const ranked = notes
      .map((note) => ({ note, score: [...query].filter((term) => tokenSet(`${note.title} ${note.contentMarkdown}`).has(term)).length }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return {
      answer: ranked.length ? `Contexto recuperado em: ${ranked.map(({ note }) => `[[${note.title}]]`).join(", ")}.` : "Não encontrei evidência suficiente no vault.",
      sourceNoteIds: ranked.map(({ note }) => note.id),
    };
  }
}
