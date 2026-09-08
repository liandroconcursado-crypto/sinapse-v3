"use client";

import type { LinkRecord } from "@/domain/vault/types";

const LINK_PATTERN = /\[\[([^\[\]\n|]+?)(?:\|([^\[\]\n]+?))?\]\]/g;

export function MarkdownPreview({ markdown, links, onOpen, onCreate }: {
  markdown: string;
  links: LinkRecord[];
  onOpen: (noteId: string) => void;
  onCreate: (title: string) => void;
}) {
  const byTarget = new Map(links.map((link) => [`${link.targetText}\u0000${link.alias ?? ""}`, link]));
  const lines = markdown.split("\n");

  return <article className="markdown-preview">{lines.map((line, lineIndex) => {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const content = heading?.[2] ?? line;
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    for (const match of content.matchAll(LINK_PATTERN)) {
      const index = match.index ?? 0;
      parts.push(content.slice(cursor, index));
      const target = match[1].trim();
      const alias = match[2]?.trim() ?? null;
      const link = byTarget.get(`${target}\u0000${alias ?? ""}`);
      parts.push(
        <button
          type="button"
          className={link?.targetNoteId ? "wikilink" : "wikilink broken"}
          key={`${lineIndex}-${index}`}
          onClick={() => link?.targetNoteId ? onOpen(link.targetNoteId) : onCreate(target)}
          title={link?.targetNoteId ? `Abrir ${target}` : `Criar ${target}`}
        >{alias ?? target}</button>,
      );
      cursor = index + match[0].length;
    }
    parts.push(content.slice(cursor));
    if (heading) {
      const Heading = `h${heading[1].length}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Heading key={lineIndex}>{parts}</Heading>;
    }
    return line.trim() ? <p key={lineIndex}>{parts}</p> : <br key={lineIndex} />;
  })}</article>;
}
