import { createHash } from "node:crypto";

export type TextChunk = { id: string; index: number; text: string; hash: string };

export function normalizeIngestionText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[\t ]+\n/g, "\n").trim();
}

export function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function chunkText(rawText: string, maxCharacters = 12_000): TextChunk[] {
  if (maxCharacters < 1_000) throw new Error("Chunks devem ter ao menos 1000 caracteres.");
  const text = normalizeIngestionText(rawText);
  if (!text) return [];
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  function flush() {
    if (current) chunks.push(current);
    current = "";
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxCharacters) {
      flush();
      for (let offset = 0; offset < paragraph.length; offset += maxCharacters) {
        chunks.push(paragraph.slice(offset, offset + maxCharacters));
      }
      continue;
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxCharacters) flush();
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  flush();

  return chunks.map((chunk, index) => {
    const hash = hashText(chunk);
    return { id: `chunk-${String(index + 1).padStart(4, "0")}-${hash.slice(0, 12)}`, index, text: chunk, hash };
  });
}
