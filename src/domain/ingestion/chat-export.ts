const MAX_IMPORT_CHARACTERS = 8_000_000;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messageText(node: unknown): { role: string; text: string; timestamp: number } | null {
  if (!isObject(node) || !isObject(node.message)) return null;
  const message = node.message;
  if (!isObject(message.author) || !isObject(message.content) || !Array.isArray(message.content.parts)) return null;
  const text = message.content.parts.filter((part): part is string => typeof part === "string").join("\n").trim();
  if (!text) return null;
  const role = typeof message.author.role === "string" ? message.author.role : "unknown";
  const timestamp = typeof message.create_time === "number" ? message.create_time : 0;
  return { role, text, timestamp };
}

function conversationMarkdown(value: unknown, index: number): string | null {
  if (!isObject(value) || !isObject(value.mapping)) return null;
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : `Conversa ${index + 1}`;
  const messages = Object.values(value.mapping)
    .map(messageText)
    .filter((message): message is NonNullable<typeof message> => message !== null)
    .sort((left, right) => left.timestamp - right.timestamp);
  if (!messages.length) return null;
  const body = messages.map((message) => {
    const label = message.role === "user" ? "Usuário" : message.role === "assistant" ? "ChatGPT" : message.role;
    return `**${label}:** ${message.text}`;
  }).join("\n\n");
  return `# Conversa · ${title}\n\n${body}`;
}

export function parseKnowledgeFile(name: string, raw: string): { text: string; notice?: string } {
  if (!/\.json$/i.test(name)) return { text: raw };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("O JSON não pôde ser lido. Exporte novamente ou use Markdown/texto.");
  }
  if (!Array.isArray(parsed)) return { text: JSON.stringify(parsed, null, 2) };
  const conversations = parsed.map(conversationMarkdown).filter((item): item is string => item !== null);
  if (!conversations.length) return { text: JSON.stringify(parsed, null, 2) };
  const selected: string[] = [];
  let length = 0;
  for (let index = conversations.length - 1; index >= 0; index -= 1) {
    const conversation = conversations[index];
    if (length + conversation.length > MAX_IMPORT_CHARACTERS) continue;
    selected.unshift(conversation);
    length += conversation.length + 2;
  }
  return {
    text: selected.join("\n\n"),
    notice: selected.length === conversations.length
      ? `${conversations.length} conversas do ChatGPT foram reconhecidas.`
      : `${selected.length} de ${conversations.length} conversas mais recentes foram carregadas nesta etapa.`,
  };
}
