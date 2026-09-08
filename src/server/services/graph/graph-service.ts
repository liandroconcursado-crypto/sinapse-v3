import type { RequestContext } from "@/domain/vault/types";
import { db } from "@/server/db";
import { vaultLinks, vaultNotes, vaults } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { VaultNotFoundError } from "@/server/repositories/vault-repository";

export type GraphProjection = {
  nodes: Array<{ id: string; title: string; path: string; tags: string[]; degree: number }>;
  edges: Array<{ id: string; source: string; target: string; kind: string; weight: number }>;
};

type GraphNote = Pick<typeof vaultNotes.$inferSelect, "id" | "title" | "path" | "tags">;
type GraphLink = Pick<typeof vaultLinks.$inferSelect, "id" | "sourceNoteId" | "targetNoteId" | "kind" | "occurrenceCount">;

export function projectGraph(notes: GraphNote[], links: GraphLink[]): GraphProjection {
  const resolved = links.filter((link): link is GraphLink & { targetNoteId: string } => link.targetNoteId !== null);
  const degree = new Map<string, number>();
  for (const link of resolved) {
    degree.set(link.sourceNoteId, (degree.get(link.sourceNoteId) ?? 0) + 1);
    degree.set(link.targetNoteId, (degree.get(link.targetNoteId) ?? 0) + 1);
  }
  return {
    nodes: notes.map((note) => ({ id: note.id, title: note.title, path: note.path, tags: note.tags, degree: degree.get(note.id) ?? 0 })),
    edges: resolved.map((link) => ({ id: link.id, source: link.sourceNoteId, target: link.targetNoteId, kind: link.kind, weight: link.occurrenceCount })),
  };
}

export class GraphService {
  async project(context: RequestContext, vaultId: string): Promise<GraphProjection> {
    const owned = await db.select({ id: vaults.id }).from(vaults).where(and(eq(vaults.id, vaultId), eq(vaults.userId, context.userId))).limit(1);
    if (!owned[0]) throw new VaultNotFoundError("Vault não encontrado.");
    const [notes, links] = await Promise.all([
      db.select().from(vaultNotes).where(and(eq(vaultNotes.vaultId, vaultId), eq(vaultNotes.userId, context.userId))),
      db.select().from(vaultLinks).where(eq(vaultLinks.vaultId, vaultId)),
    ]);
    return projectGraph(notes, links);
  }
}
