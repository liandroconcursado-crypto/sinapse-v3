import { getRequestContext } from "@/server/auth/context";
import { apiError } from "@/server/http/api-error";
import { NoteService } from "@/server/services/notes/note-service";

const notes = new NoteService();

export async function GET() {
  try {
    const context = await getRequestContext();
    const vaultId = await notes.ensureDefaultVault(context);
    return Response.json({ vaultId, notes: await notes.listNotes(context, vaultId) });
  } catch (error) {
    return apiError(error);
  }
}
