import { normalizeWikiTarget } from "@/domain/wikilinks/wikilinks";
import type { NoteDetail, NoteRecord, RequestContext } from "@/domain/vault/types";
import { VaultRepository } from "@/server/repositories/vault-repository";

export type MemorySearchResult = Pick<NoteRecord, "id" | "path" | "title" | "tags" | "updatedAt"> & {
  snippet: string;
  score: number;
};

type VaultReader = Pick<VaultRepository, "ensureDefaultVault" | "listNotes" | "getNote">;

function terms(value: string): string[] {
  return normalizeWikiTarget(value).split(/\s+/).filter((term) => term.length > 1);
}

function snippet(note: NoteRecord, queryTerms: string[]): string {
  const plain = note.contentMarkdown.replace(/[#*_`>\[\]]/g, " ").replace(/\s+/g, " ").trim();
  const lower = plain.toLocaleLowerCase("pt-BR");
  const first = queryTerms.map((term) => lower.indexOf(term)).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? 0;
  return plain.slice(Math.max(0, first - 80), Math.max(0, first - 80) + 320);
}

export class MemoryService {
  constructor(private readonly vaults: VaultReader = new VaultRepository()) {}

  ensureVault(context: RequestContext): Promise<string> {
    return this.vaults.ensureDefaultVault(context);
  }

  async search(context: RequestContext, input: { query: string; limit?: number; folder?: string; tag?: string }): Promise<MemorySearchResult[]> {
    const vaultId = await this.vaults.ensureDefaultVault(context);
    const notes = await this.vaults.listNotes(context, vaultId);
    const queryTerms = terms(input.query);
    const folder = input.folder?.toLocaleLowerCase("pt-BR");
    const tag = input.tag?.toLocaleLowerCase("pt-BR");
    return notes
      .filter((note) => !folder || note.path.toLocaleLowerCase("pt-BR").startsWith(folder))
      .filter((note) => !tag || note.tags.some((value) => value.toLocaleLowerCase("pt-BR") === tag))
      .map((note) => {
        const title = normalizeWikiTarget(note.title);
        const path = normalizeWikiTarget(note.path);
        const body = normalizeWikiTarget(note.contentMarkdown);
        const noteTags = note.tags.map(normalizeWikiTarget);
        const score = queryTerms.reduce((total, term) => total
          + (title.includes(term) ? 12 : 0)
          + (path.includes(term) ? 6 : 0)
          + (noteTags.some((value) => value.includes(term)) ? 5 : 0)
          + (body.includes(term) ? 2 : 0), 0);
        return { ...note, score, snippet: snippet(note, queryTerms) };
      })
      .filter((note) => queryTerms.length === 0 || note.score > 0)
      .sort((left, right) => right.score - left.score || right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, Math.min(input.limit ?? 8, 20))
      .map((note) => ({
        id: note.id,
        path: note.path,
        title: note.title,
        tags: note.tags,
        updatedAt: note.updatedAt,
        snippet: note.snippet,
        score: note.score,
      }));
  }

  async fetch(context: RequestContext, noteId: string): Promise<NoteDetail> {
    const vaultId = await this.vaults.ensureDefaultVault(context);
    return this.vaults.getNote(context, vaultId, noteId);
  }

  async getContext(context: RequestContext, input: { intent: string; project?: string; limit?: number }) {
    const query = [input.intent, input.project].filter(Boolean).join(" ");
    const matches = await this.search(context, { query, limit: input.limit ?? 8 });
    const master = await this.search(context, { query: "Contexto Mestre", limit: 1 });
    const ids = new Set<string>();
    return [...master, ...matches].filter((note) => !ids.has(note.id) && ids.add(note.id));
  }
}
