export type WikiLinkOccurrence = {
  targetText: string;
  targetNormalized: string;
  alias: string | null;
};

const WIKILINK = /\[\[([^\[\]\n|]+?)(?:\|([^\[\]\n]+?))?\]\]/g;

export function normalizeWikiTarget(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function maskCode(markdown: string): string {
  const withoutFences = markdown.replace(
    /(^|\n)( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\2\3(?=\n|$)|$)/g,
    (block) => block.replace(/[^\n]/g, " "),
  );
  return withoutFences.replace(/(`+)([^\n]*?)\1/g, (block) => " ".repeat(block.length));
}

export function parseWikiLinks(markdown: string): WikiLinkOccurrence[] {
  return [...maskCode(markdown).matchAll(WIKILINK)].map((match) => {
    const targetText = match[1].trim();
    return {
      targetText,
      targetNormalized: normalizeWikiTarget(targetText),
      alias: match[2]?.trim() || null,
    };
  });
}

export type AggregatedWikiLink = WikiLinkOccurrence & { occurrenceCount: number };

export function aggregateWikiLinks(markdown: string): AggregatedWikiLink[] {
  const links = new Map<string, AggregatedWikiLink>();
  for (const occurrence of parseWikiLinks(markdown)) {
    const key = `${occurrence.targetNormalized}\u0000${occurrence.alias ?? ""}`;
    const current = links.get(key);
    if (current) current.occurrenceCount += 1;
    else links.set(key, { ...occurrence, occurrenceCount: 1 });
  }
  return [...links.values()];
}
