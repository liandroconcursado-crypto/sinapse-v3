export type RequestContext = Readonly<{ userId: string }>;

export type NoteRecord = {
  id: string;
  vaultId: string;
  path: string;
  title: string;
  contentMarkdown: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type LinkRecord = {
  id: string;
  sourceNoteId: string;
  targetNoteId: string | null;
  targetText: string;
  targetNormalized: string;
  alias: string | null;
  occurrenceCount: number;
  kind: "wikilink" | "suggested" | "confirmed";
};

export type NoteDetail = NoteRecord & {
  outgoing: LinkRecord[];
  backlinks: Array<{ source: NoteRecord; link: LinkRecord }>;
};
