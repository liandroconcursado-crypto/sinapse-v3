import { and, eq } from "drizzle-orm";
import { ingestionProposalSchema, type IngestionProposal } from "@/domain/ingestion/schema";
import { aggregateWikiLinks, normalizeWikiTarget } from "@/domain/wikilinks/wikilinks";
import { normalizeVaultPath } from "@/domain/vault/path";
import { renderProposedMarkdown } from "@/domain/ingestion/render";
import type { RequestContext } from "@/domain/vault/types";
import { db } from "@/server/db";
import { aiJobs, ingestions, vaultLinks, vaultNotes, vaults } from "@/server/db/schema";
import { VaultNotFoundError } from "./vault-repository";

type JobStatus = typeof aiJobs.$inferInsert.status;
type IngestionStatus = typeof ingestions.$inferInsert.status;

export type IngestionJobRecord = {
  ingestionId: string;
  jobId: string;
  vaultId: string;
  status: NonNullable<typeof aiJobs.$inferSelect.status>;
  stage: string;
  progress: number;
  attempts: number;
  provider: string;
  proposal: IngestionProposal | null;
  commitResult: { noteIds: string[] } | null;
  errorMessage: string | null;
};

function parseResult(value: Record<string, unknown> | null): Pick<IngestionJobRecord, "proposal" | "commitResult"> {
  const proposalResult = ingestionProposalSchema.safeParse(value?.proposal);
  const commitValue = value?.commitResult;
  const noteIds = typeof commitValue === "object" && commitValue !== null && "noteIds" in commitValue && Array.isArray(commitValue.noteIds)
    ? commitValue.noteIds.filter((id): id is string => typeof id === "string")
    : null;
  return { proposal: proposalResult.success ? proposalResult.data : null, commitResult: noteIds ? { noteIds } : null };
}

function record(ingestion: typeof ingestions.$inferSelect, job: typeof aiJobs.$inferSelect): IngestionJobRecord {
  return {
    ingestionId: ingestion.id,
    jobId: job.id,
    vaultId: ingestion.vaultId,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    attempts: job.attempts,
    provider: job.provider,
    ...parseResult(job.resultJson),
    errorMessage: job.errorMessageSafe,
  };
}

export class IngestionRepository {
  async getOrCreate(context: RequestContext, input: {
    vaultId: string;
    mode: "build" | "expand";
    sourceName: string;
    contentHash: string;
    rawText: string;
    provider: string;
  }): Promise<IngestionJobRecord> {
    return db.transaction(async (transaction) => {
      const owned = await transaction.select({ id: vaults.id }).from(vaults).where(and(eq(vaults.id, input.vaultId), eq(vaults.userId, context.userId))).limit(1);
      if (!owned[0]) throw new VaultNotFoundError("Vault não encontrado.");

      await transaction.insert(ingestions).values({
        vaultId: input.vaultId,
        userId: context.userId,
        mode: input.mode,
        sourceName: input.sourceName,
        contentHash: input.contentHash,
        rawText: input.rawText,
      }).onConflictDoNothing();
      const ingestion = (await transaction.select().from(ingestions).where(and(
        eq(ingestions.vaultId, input.vaultId),
        eq(ingestions.userId, context.userId),
        eq(ingestions.contentHash, input.contentHash),
        eq(ingestions.mode, input.mode),
      )).limit(1))[0];
      if (!ingestion) throw new Error("Falha ao criar ingestão.");

      await transaction.insert(aiJobs).values({ ingestionId: ingestion.id, provider: input.provider }).onConflictDoNothing();
      const job = (await transaction.select().from(aiJobs).where(eq(aiJobs.ingestionId, ingestion.id)).limit(1))[0];
      if (!job) throw new Error("Falha ao criar job de ingestão.");
      return record(ingestion, job);
    });
  }

  async get(context: RequestContext, ingestionId: string): Promise<IngestionJobRecord> {
    const rows = await db.select({ ingestion: ingestions, job: aiJobs })
      .from(ingestions)
      .innerJoin(aiJobs, eq(aiJobs.ingestionId, ingestions.id))
      .where(and(eq(ingestions.id, ingestionId), eq(ingestions.userId, context.userId)))
      .limit(1);
    if (!rows[0]) throw new VaultNotFoundError("Ingestão não encontrada.");
    return record(rows[0].ingestion, rows[0].job);
  }

  async updateJob(context: RequestContext, ingestionId: string, update: {
    status: JobStatus;
    stage: string;
    progress: number;
    ingestionStatus: IngestionStatus;
    proposal?: IngestionProposal;
    errorCode?: string | null;
    errorMessageSafe?: string | null;
    incrementAttempts?: boolean;
  }): Promise<IngestionJobRecord> {
    const current = await this.get(context, ingestionId);
    const resultJson = update.proposal ? { proposal: update.proposal } : undefined;
    await db.transaction(async (transaction) => {
      await transaction.update(ingestions).set({ status: update.ingestionStatus, updatedAt: new Date() })
        .where(and(eq(ingestions.id, ingestionId), eq(ingestions.userId, context.userId)));
      await transaction.update(aiJobs).set({
        status: update.status,
        stage: update.stage,
        progress: update.progress,
        attempts: update.incrementAttempts ? current.attempts + 1 : current.attempts,
        resultJson,
        errorCode: update.errorCode,
        errorMessageSafe: update.errorMessageSafe,
        updatedAt: new Date(),
      }).where(eq(aiJobs.id, current.jobId));
    });
    return this.get(context, ingestionId);
  }

  async commit(context: RequestContext, ingestionId: string, selectedTemporaryIds: string[]): Promise<IngestionJobRecord> {
    return db.transaction(async (transaction) => {
      const rows = await transaction.select({ ingestion: ingestions, job: aiJobs })
        .from(ingestions)
        .innerJoin(aiJobs, eq(aiJobs.ingestionId, ingestions.id))
        .where(and(eq(ingestions.id, ingestionId), eq(ingestions.userId, context.userId)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new VaultNotFoundError("Ingestão não encontrada.");
      const existingResult = parseResult(row.job.resultJson);
      if (row.job.status === "committed") return record(row.ingestion, row.job);
      const proposal = existingResult.proposal;
      if (!proposal || row.job.status !== "awaiting_review") throw new Error("A ingestão ainda não está pronta para revisão.");

      const selected = new Set(selectedTemporaryIds);
      const accepted = proposal.notes.filter((note) => selected.has(note.temporaryId));
      if (accepted.some((note) => note.operation === "possible_duplicate")) {
        throw new Error("Possíveis duplicatas precisam ser resolvidas antes do commit.");
      }

      await transaction.update(aiJobs).set({ status: "committing", stage: "committing", progress: 90, updatedAt: new Date() }).where(eq(aiJobs.id, row.job.id));
      const affectedIds: string[] = [];
      for (const proposed of accepted) {
        const normalizedTitle = normalizeWikiTarget(proposed.title);
        const titleMatches = await transaction.select().from(vaultNotes).where(and(
          eq(vaultNotes.vaultId, row.ingestion.vaultId),
          eq(vaultNotes.userId, context.userId),
          eq(vaultNotes.normalizedTitle, normalizedTitle),
        ));
        const existing = proposed.operation === "update" && titleMatches.length === 1 ? titleMatches[0] : undefined;
        const path = normalizeVaultPath(existing?.path ?? proposed.proposedPath);
        const contentMarkdown = renderProposedMarkdown(proposed, existing?.contentMarkdown);
        let noteId: string;
        if (existing) {
          noteId = existing.id;
          await transaction.update(vaultNotes).set({
            contentMarkdown,
            tags: [...new Set([...existing.tags, ...proposed.tags])],
            version: existing.version + 1,
            updatedAt: new Date(),
          }).where(and(eq(vaultNotes.id, existing.id), eq(vaultNotes.userId, context.userId)));
        } else {
          const inserted = await transaction.insert(vaultNotes).values({
            vaultId: row.ingestion.vaultId,
            userId: context.userId,
            path,
            title: proposed.title,
            normalizedTitle,
            contentMarkdown,
            tags: proposed.tags,
          }).returning({ id: vaultNotes.id });
          if (!inserted[0]) throw new Error("Falha ao criar nota proposta.");
          noteId = inserted[0].id;
        }
        affectedIds.push(noteId);
        await transaction.delete(vaultLinks).where(eq(vaultLinks.sourceNoteId, noteId));
        const parsedLinks = aggregateWikiLinks(contentMarkdown);
        if (parsedLinks.length) {
          await transaction.insert(vaultLinks).values(parsedLinks.map((link) => ({
            vaultId: row.ingestion.vaultId,
            sourceNoteId: noteId,
            targetText: link.targetText,
            targetNormalized: link.targetNormalized,
            alias: link.alias,
            occurrenceCount: link.occurrenceCount,
          })));
        }
      }

      await resolveLinks(transaction, row.ingestion.vaultId, context.userId);
      const resultJson = { proposal, commitResult: { noteIds: affectedIds } };
      await transaction.update(aiJobs).set({ status: "committed", stage: "completed", progress: 100, resultJson, updatedAt: new Date() }).where(eq(aiJobs.id, row.job.id));
      await transaction.update(ingestions).set({ status: "completed", updatedAt: new Date() }).where(eq(ingestions.id, ingestionId));
      return record({ ...row.ingestion, status: "completed", updatedAt: new Date() }, { ...row.job, status: "committed", stage: "completed", progress: 100, resultJson, updatedAt: new Date() });
    });
  }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function resolveLinks(transaction: Transaction, vaultId: string, userId: string) {
  const notes = await transaction.select().from(vaultNotes).where(and(eq(vaultNotes.vaultId, vaultId), eq(vaultNotes.userId, userId)));
  const links = await transaction.select().from(vaultLinks).where(eq(vaultLinks.vaultId, vaultId));
  const byPath = new Map(notes.map((note) => [normalizeWikiTarget(note.path), note.id]));
  const byTitle = new Map<string, string[]>();
  for (const note of notes) byTitle.set(note.normalizedTitle, [...(byTitle.get(note.normalizedTitle) ?? []), note.id]);
  for (const link of links) {
    const pathKey = normalizeWikiTarget(link.targetText.endsWith(".md") ? link.targetText : `${link.targetText}.md`);
    const matches = byTitle.get(link.targetNormalized) ?? [];
    const targetNoteId = byPath.get(pathKey) ?? (matches.length === 1 ? matches[0] : null);
    await transaction.update(vaultLinks).set({ targetNoteId, updatedAt: new Date() }).where(eq(vaultLinks.id, link.id));
  }
}
