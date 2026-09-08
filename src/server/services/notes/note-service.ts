import { z } from "zod";
import { aggregateWikiLinks, normalizeWikiTarget } from "@/domain/wikilinks/wikilinks";
import { normalizeVaultPath, pathTitle } from "@/domain/vault/path";
import type { NoteDetail, NoteRecord, RequestContext } from "@/domain/vault/types";
import { VaultRepository } from "@/server/repositories/vault-repository";

export const saveNoteInputSchema = z.object({
  vaultId: z.string().uuid(),
  noteId: z.string().uuid().optional(),
  path: z.string().min(1).max(500),
  title: z.string().trim().min(1).max(200).optional(),
  contentMarkdown: z.string().max(2_000_000),
  tags: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  expectedVersion: z.number().int().positive().optional(),
});

export class NoteService {
  constructor(private readonly repository = new VaultRepository()) {}

  ensureDefaultVault(context: RequestContext): Promise<string> {
    return this.repository.ensureDefaultVault(context);
  }

  listNotes(context: RequestContext, vaultId: string): Promise<NoteRecord[]> {
    return this.repository.listNotes(context, vaultId);
  }

  getNote(context: RequestContext, vaultId: string, noteId: string): Promise<NoteDetail> {
    return this.repository.getNote(context, vaultId, noteId);
  }

  saveNote(context: RequestContext, rawInput: unknown): Promise<NoteDetail> {
    const input = saveNoteInputSchema.parse(rawInput);
    const path = normalizeVaultPath(input.path);
    const title = input.title ?? pathTitle(path);
    return this.repository.saveNote(context, {
      ...input,
      path,
      title,
      normalizedTitle: normalizeWikiTarget(title),
      links: aggregateWikiLinks(input.contentMarkdown),
    });
  }
}
