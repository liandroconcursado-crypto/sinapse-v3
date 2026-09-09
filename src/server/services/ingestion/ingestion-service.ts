import { chunkText, hashText, normalizeIngestionText } from "@/domain/ingestion/chunking";
import { normalizeWikiTarget } from "@/domain/wikilinks/wikilinks";
import { commitIngestionInputSchema, createIngestionInputSchema, ingestionProposalSchema } from "@/domain/ingestion/schema";
import type { RequestContext } from "@/domain/vault/types";
import { VaultRepository } from "@/server/repositories/vault-repository";
import { IngestionRepository, type IngestionJobRecord } from "@/server/repositories/ingestion-repository";
import { createAIProvider } from "@/server/services/ai/provider";

export class IngestionService {
  constructor(
    private readonly repository = new IngestionRepository(),
    private readonly vaults = new VaultRepository(),
  ) {}

  async createProposal(context: RequestContext, rawInput: unknown): Promise<IngestionJobRecord> {
    const input = createIngestionInputSchema.parse(rawInput);
    const text = normalizeIngestionText(input.text);
    const provider = createAIProvider();
    const job = await this.repository.getOrCreate(context, {
      vaultId: input.vaultId,
      mode: input.mode,
      sourceName: input.sourceName,
      contentHash: hashText(text),
      rawText: text,
      provider: provider.name,
    });
    if (job.status === "committed") return job;
    if (job.status === "awaiting_review") {
      if (!input.autoApply || !job.proposal) return job;
      return this.repository.commit(context, job.ingestionId, job.proposal.notes.filter((note) => note.operation !== "possible_duplicate").map((note) => note.temporaryId));
    }

    try {
      await this.repository.updateJob(context, job.ingestionId, { status: "running", stage: "normalizing", progress: 10, ingestionStatus: "processing", incrementAttempts: true });
      const chunks = chunkText(text);
      await this.repository.updateJob(context, job.ingestionId, { status: "running", stage: "chunking", progress: 20, ingestionStatus: "processing" });
      const extractions = [];
      const progressInterval = Math.max(1, Math.ceil(chunks.length / 20));
      for (let index = 0; index < chunks.length; index += 1) {
        extractions.push(await provider.extractChunk({ chunk: chunks[index] }));
        if ((index + 1) % progressInterval === 0 || index === chunks.length - 1) {
          const progress = 25 + Math.round(((index + 1) / chunks.length) * 45);
          await this.repository.updateJob(context, job.ingestionId, { status: "running", stage: "extracting", progress, ingestionStatus: "processing" });
        }
      }
      await this.repository.updateJob(context, job.ingestionId, { status: "running", stage: "merging", progress: 75, ingestionStatus: "processing" });
      const notes = await this.vaults.listNotes(context, input.vaultId);
      const proposal = ingestionProposalSchema.parse(await provider.mergeExtractions({
        extractions,
        vaultIndex: notes.map((note) => ({ ...note, normalizedTitle: normalizeWikiTarget(note.title) })),
        inputSummary: text.slice(0, 500),
        sourceName: input.sourceName,
        mode: input.mode,
      }));
      await this.repository.updateJob(context, job.ingestionId, {
        status: "running",
        stage: "planning",
        progress: 90,
        ingestionStatus: "processing",
      });
      const awaiting = await this.repository.updateJob(context, job.ingestionId, { status: "awaiting_review", stage: "awaiting_review", progress: 95, ingestionStatus: "awaiting_review", proposal });
      if (!input.autoApply) return awaiting;
      const safeIds = proposal.notes.filter((note) => note.operation !== "possible_duplicate").map((note) => note.temporaryId);
      return this.repository.commit(context, job.ingestionId, safeIds);
    } catch (error) {
      await this.repository.updateJob(context, job.ingestionId, {
        status: "failed",
        stage: "failed",
        progress: 0,
        ingestionStatus: "failed",
        errorCode: "PROCESSING_FAILED",
        errorMessageSafe: "Não foi possível preparar a proposta. Tente novamente.",
      });
      throw error;
    }
  }

  get(context: RequestContext, ingestionId: string) {
    return this.repository.get(context, ingestionId);
  }

  commit(context: RequestContext, ingestionId: string, rawInput: unknown) {
    const input = commitIngestionInputSchema.parse(rawInput);
    return this.repository.commit(context, ingestionId, input.selectedTemporaryIds);
  }
}
