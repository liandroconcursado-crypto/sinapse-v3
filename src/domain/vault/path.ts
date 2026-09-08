import { z } from "zod";

const WINDOWS_DRIVE = /^[a-zA-Z]:/;

export const vaultPathSchema = z
  .string()
  .min(1)
  .max(500)
  .transform((value) => value.replaceAll("\\", "/").replace(/^\.\//, ""))
  .superRefine((value, context) => {
    const segments = value.split("/");
    if (value.includes("\0") || value.startsWith("/") || WINDOWS_DRIVE.test(value)) {
      context.addIssue({ code: "custom", message: "O path deve ser relativo ao vault." });
    }
    if (segments.some((segment) => segment === ".." || segment === "")) {
      context.addIssue({ code: "custom", message: "O path contém segmento inseguro." });
    }
    if (!value.toLowerCase().endsWith(".md")) {
      context.addIssue({ code: "custom", message: "Notas precisam usar a extensão .md." });
    }
  });

export function normalizeVaultPath(input: string): string {
  return vaultPathSchema.parse(input);
}

export function pathTitle(path: string): string {
  const filename = path.split("/").at(-1) ?? path;
  return filename.replace(/\.md$/i, "");
}
