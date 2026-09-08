import JSZip from "jszip";
import { normalizeVaultPath } from "@/domain/vault/path";
import type { RequestContext } from "@/domain/vault/types";
import type { NoteRecord } from "@/domain/vault/types";
import { VaultRepository } from "@/server/repositories/vault-repository";

export async function buildVaultZip(notes: NoteRecord[]): Promise<Buffer> {
  const zip = new JSZip();
  const normalized = new Set<string>();
  for (const note of notes) {
    const path = normalizeVaultPath(note.path);
    const collisionKey = path.normalize("NFC").toLocaleLowerCase("pt-BR");
    if (normalized.has(collisionKey)) throw new Error(`Colisão de path na exportação: ${path}`);
    normalized.add(collisionKey);
    zip.file(path, note.contentMarkdown, { createFolders: true });
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export class ExportService {
  constructor(private readonly repository = new VaultRepository()) {}

  async createZip(context: RequestContext, vaultId: string): Promise<Buffer> {
    const notes = await this.repository.listNotes(context, vaultId);
    return buildVaultZip(notes);
  }
}
