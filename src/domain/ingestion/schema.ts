import { z } from "zod";

export const epistemicStatusSchema = z.enum(["explicit", "inferred", "suggested"]);
export const noteKindSchema = z.enum(["context", "project", "area", "knowledge", "source", "decision", "action", "journal", "system"]);

export const evidenceSchema = z.object({
  chunkId: z.string().min(1).max(100),
  excerpt: z.string().trim().min(1).max(320),
});

export const proposedNoteSchema = z.object({
  temporaryId: z.string().min(1).max(100),
  operation: z.enum(["create", "update", "possible_duplicate"]),
  proposedPath: z.string().min(1).max(500),
  title: z.string().trim().min(1).max(200),
  kind: noteKindSchema,
  epistemicStatus: epistemicStatusSchema,
  summary: z.string().trim().min(1).max(2_000),
  markdownSections: z.array(z.object({
    heading: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(20_000),
    mode: z.enum(["append", "replace_managed"]),
  })).min(1).max(30),
  tags: z.array(z.string().trim().min(1).max(80)).max(100),
  links: z.array(z.object({
    targetTitle: z.string().trim().min(1).max(200),
    alias: z.string().trim().min(1).max(200).optional(),
    reason: z.string().trim().min(1).max(500),
    epistemicStatus: epistemicStatusSchema,
  })).max(100),
  evidence: z.array(evidenceSchema).max(30),
  confidence: z.number().min(0).max(1),
}).superRefine((note, context) => {
  if (note.epistemicStatus !== "suggested" && note.evidence.length === 0) {
    context.addIssue({ code: "custom", path: ["evidence"], message: "Notas factuais exigem evidência." });
  }
  if (["decision", "action", "source"].includes(note.kind) && note.epistemicStatus === "inferred") {
    context.addIssue({ code: "custom", path: ["epistemicStatus"], message: "Decisões, ações e fontes não podem ser inferidas." });
  }
});

export const ingestionProposalSchema = z.object({
  schemaVersion: z.literal(1),
  inputSummary: z.string().trim().min(1).max(2_000),
  notes: z.array(proposedNoteSchema).max(100),
  warnings: z.array(z.string().trim().min(1).max(500)).max(50),
  unresolved: z.array(z.object({ label: z.string().trim().min(1).max(200), reason: z.string().trim().min(1).max(500) })).max(50),
});

export type EpistemicStatus = z.infer<typeof epistemicStatusSchema>;
export type NoteKind = z.infer<typeof noteKindSchema>;
export type ProposedNote = z.infer<typeof proposedNoteSchema>;
export type IngestionProposal = z.infer<typeof ingestionProposalSchema>;

export const createIngestionInputSchema = z.object({
  vaultId: z.string().uuid(),
  mode: z.enum(["build", "expand"]).default("expand"),
  sourceName: z.string().trim().min(1).max(240).default("Texto colado"),
  text: z.string().trim().min(1).max(8_000_000),
  autoApply: z.boolean().default(true),
});

export const commitIngestionInputSchema = z.object({
  selectedTemporaryIds: z.array(z.string().min(1).max(100)).max(100),
});
