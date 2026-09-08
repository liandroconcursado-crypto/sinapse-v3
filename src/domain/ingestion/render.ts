import type { ProposedNote } from "./schema";

const MANAGED_START = "<!-- sinapse:managed:start -->";
const MANAGED_END = "<!-- sinapse:managed:end -->";

function renderSections(note: ProposedNote): string {
  const links = note.links.map((link) => `- [[${link.targetTitle}${link.alias ? `|${link.alias}` : ""}]] — ${link.reason}`);
  const sections = note.markdownSections.map((section) => `## ${section.heading}\n\n${section.body}`);
  if (links.length) sections.push(`## Conexões\n\n${links.join("\n")}`);
  return sections.join("\n\n");
}

export function renderProposedMarkdown(note: ProposedNote, existingMarkdown?: string): string {
  const rendered = renderSections(note);
  if (!existingMarkdown) return `# ${note.title}\n\n${rendered}\n`;

  const replaceManaged = note.markdownSections.some((section) => section.mode === "replace_managed");
  if (replaceManaged) {
    const managed = `${MANAGED_START}\n${rendered}\n${MANAGED_END}`;
    const pattern = new RegExp(`${MANAGED_START}[\\s\\S]*?${MANAGED_END}`);
    return pattern.test(existingMarkdown)
      ? existingMarkdown.replace(pattern, managed)
      : `${existingMarkdown.trimEnd()}\n\n${managed}\n`;
  }
  return `${existingMarkdown.trimEnd()}\n\n${rendered}\n`;
}
