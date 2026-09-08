import type { IngestionProposal, NoteKind, EpistemicStatus } from "@/domain/ingestion/schema";
import type { TextChunk } from "@/domain/ingestion/chunking";

export type ExtractedObservation = {
  key: string;
  title: string;
  kind: NoteKind;
  epistemicStatus: EpistemicStatus;
  summary: string;
  excerpt: string;
};

export type ChunkExtraction = { chunkId: string; observations: ExtractedObservation[]; warnings: string[] };
export type VaultIndexEntry = { id: string; path: string; title: string; normalizedTitle: string; tags: string[] };

export interface AIProvider {
  readonly name: string;
  extractChunk(input: { chunk: TextChunk }): Promise<ChunkExtraction>;
  mergeExtractions(input: { extractions: ChunkExtraction[]; vaultIndex: VaultIndexEntry[]; inputSummary: string }): Promise<IngestionProposal>;
  answerFromVault(input: { question: string; notes: Array<{ id: string; title: string; contentMarkdown: string }> }): Promise<{ answer: string; sourceNoteIds: string[] }>;
}
