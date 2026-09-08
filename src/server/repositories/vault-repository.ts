import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { vaultLinks, vaultNotes, vaults } from "@/server/db/schema";
import type { AggregatedWikiLink } from "@/domain/wikilinks/wikilinks";
import { normalizeWikiTarget } from "@/domain/wikilinks/wikilinks";
import type { LinkRecord, NoteDetail, NoteRecord, RequestContext } from "@/domain/vault/types";

export class VaultNotFoundError extends Error {}
export class NoteNotFoundError extends Error {}
export class NoteConflictError extends Error {}

function noteRecord(note: typeof vaultNotes.$inferSelect): NoteRecord {
  return {
    id: note.id,
    vaultId: note.vaultId,
    path: note.path,
    title: note.title,
    contentMarkdown: note.contentMarkdown,
    tags: note.tags,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    version: note.version,
  };
}

function linkRecord(link: typeof vaultLinks.$inferSelect): LinkRecord {
  return {
    id: link.id,
    sourceNoteId: link.sourceNoteId,
    targetNoteId: link.targetNoteId,
    targetText: link.targetText,
    targetNormalized: link.targetNormalized,
    alias: link.alias,
    occurrenceCount: link.occurrenceCount,
    kind: link.kind,
  };
}

export class VaultRepository {
  async ensureDefaultVault(context: RequestContext): Promise<string> {
    const current = await db.select({ id: vaults.id }).from(vaults).where(eq(vaults.userId, context.userId)).limit(1);
    if (current[0]) return current[0].id;

    await db.insert(vaults).values({ userId: context.userId, name: "Meu cérebro" }).onConflictDoNothing();
    const created = await db.select({ id: vaults.id }).from(vaults).where(eq(vaults.userId, context.userId)).limit(1);
    if (!created[0]) throw new VaultNotFoundError("Não foi possível criar o vault.");
    return created[0].id;
  }

  async listNotes(context: RequestContext, vaultId: string): Promise<NoteRecord[]> {
    await this.assertVault(context, vaultId);
    const notes = await db
      .select()
      .from(vaultNotes)
      .where(and(eq(vaultNotes.userId, context.userId), eq(vaultNotes.vaultId, vaultId)))
      .orderBy(asc(vaultNotes.path));
    return notes.map(noteRecord);
  }

  async getNote(context: RequestContext, vaultId: string, noteId: string): Promise<NoteDetail> {
    await this.assertVault(context, vaultId);
    const selected = await db
      .select()
      .from(vaultNotes)
      .where(and(eq(vaultNotes.id, noteId), eq(vaultNotes.vaultId, vaultId), eq(vaultNotes.userId, context.userId)))
      .limit(1);
    const note = selected[0];
    if (!note) throw new NoteNotFoundError("Nota não encontrada.");

    const outgoingRows = await db.select().from(vaultLinks).where(eq(vaultLinks.sourceNoteId, noteId));
    const backlinkRows = await db.select().from(vaultLinks).where(eq(vaultLinks.targetNoteId, noteId));
    const sources = await db
      .select()
      .from(vaultNotes)
      .where(and(eq(vaultNotes.vaultId, vaultId), eq(vaultNotes.userId, context.userId)));
    const sourceById = new Map(sources.map((source) => [source.id, source]));

    return {
      ...noteRecord(note),
      outgoing: outgoingRows.map(linkRecord),
      backlinks: backlinkRows.flatMap((link) => {
        const source = sourceById.get(link.sourceNoteId);
        return source ? [{ source: noteRecord(source), link: linkRecord(link) }] : [];
      }),
    };
  }

  async saveNote(
    context: RequestContext,
    input: {
      vaultId: string;
      noteId?: string;
      path: string;
      title: string;
      normalizedTitle: string;
      contentMarkdown: string;
      tags: string[];
      expectedVersion?: number;
      links: AggregatedWikiLink[];
    },
  ): Promise<NoteDetail> {
    await db.transaction(async (transaction) => {
      const ownedVault = await transaction
        .select({ id: vaults.id })
        .from(vaults)
        .where(and(eq(vaults.id, input.vaultId), eq(vaults.userId, context.userId)))
        .limit(1);
      if (!ownedVault[0]) throw new VaultNotFoundError("Vault não encontrado.");

      let noteId = input.noteId;
      if (noteId) {
        const existing = await transaction
          .select({ version: vaultNotes.version })
          .from(vaultNotes)
          .where(and(eq(vaultNotes.id, noteId), eq(vaultNotes.vaultId, input.vaultId), eq(vaultNotes.userId, context.userId)))
          .limit(1);
        if (!existing[0]) throw new NoteNotFoundError("Nota não encontrada.");
        if (input.expectedVersion !== undefined && existing[0].version !== input.expectedVersion) {
          throw new NoteConflictError("A nota foi alterada em outra aba.");
        }
        await transaction
          .update(vaultNotes)
          .set({
            path: input.path,
            title: input.title,
            normalizedTitle: input.normalizedTitle,
            contentMarkdown: input.contentMarkdown,
            tags: input.tags,
            version: existing[0].version + 1,
            updatedAt: new Date(),
          })
          .where(and(eq(vaultNotes.id, noteId), eq(vaultNotes.userId, context.userId)));
      } else {
        const inserted = await transaction
          .insert(vaultNotes)
          .values({
            vaultId: input.vaultId,
            userId: context.userId,
            path: input.path,
            title: input.title,
            normalizedTitle: input.normalizedTitle,
            contentMarkdown: input.contentMarkdown,
            tags: input.tags,
          })
          .returning({ id: vaultNotes.id });
        noteId = inserted[0]?.id;
      }
      if (!noteId) throw new NoteNotFoundError("Falha ao persistir nota.");

      await transaction.delete(vaultLinks).where(eq(vaultLinks.sourceNoteId, noteId));
      if (input.links.length > 0) {
        await transaction.insert(vaultLinks).values(
          input.links.map((link) => ({
            vaultId: input.vaultId,
            sourceNoteId: noteId,
            targetText: link.targetText,
            targetNormalized: link.targetNormalized,
            alias: link.alias,
            occurrenceCount: link.occurrenceCount,
            kind: "wikilink" as const,
          })),
        );
      }

      const allNotes = await transaction.select().from(vaultNotes).where(eq(vaultNotes.vaultId, input.vaultId));
      const allLinks = await transaction.select().from(vaultLinks).where(eq(vaultLinks.vaultId, input.vaultId));
      const byPath = new Map(allNotes.map((note) => [normalizeWikiTarget(note.path), note.id]));
      const byTitle = new Map<string, string[]>();
      for (const note of allNotes) {
        const ids = byTitle.get(note.normalizedTitle) ?? [];
        ids.push(note.id);
        byTitle.set(note.normalizedTitle, ids);
      }
      for (const link of allLinks) {
        const pathKey = normalizeWikiTarget(link.targetText.endsWith(".md") ? link.targetText : `${link.targetText}.md`);
        const titleMatches = byTitle.get(link.targetNormalized) ?? [];
        const targetNoteId = byPath.get(pathKey) ?? (titleMatches.length === 1 ? titleMatches[0] : null);
        await transaction.update(vaultLinks).set({ targetNoteId, updatedAt: new Date() }).where(eq(vaultLinks.id, link.id));
      }
    });

    const savedId = input.noteId ?? (await db
      .select({ id: vaultNotes.id })
      .from(vaultNotes)
      .where(and(eq(vaultNotes.vaultId, input.vaultId), eq(vaultNotes.userId, context.userId), eq(vaultNotes.path, input.path)))
      .limit(1))[0]?.id;
    if (!savedId) throw new NoteNotFoundError("Nota não encontrada após salvar.");
    return this.getNote(context, input.vaultId, savedId);
  }

  private async assertVault(context: RequestContext, vaultId: string): Promise<void> {
    const owned = await db
      .select({ id: vaults.id })
      .from(vaults)
      .where(and(eq(vaults.id, vaultId), eq(vaults.userId, context.userId)))
      .limit(1);
    if (!owned[0]) throw new VaultNotFoundError("Vault não encontrado.");
  }
}
