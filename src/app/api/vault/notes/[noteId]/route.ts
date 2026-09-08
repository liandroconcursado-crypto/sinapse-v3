import { z } from "zod";
import { getRequestContext } from "@/server/auth/context";
import { apiError } from "@/server/http/api-error";
import { NoteService } from "@/server/services/notes/note-service";

const notes = new NoteService();
const querySchema = z.object({ vaultId: z.string().uuid() });

export async function GET(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  try {
    const context = await getRequestContext();
    const { noteId } = await params;
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return Response.json(await notes.getNote(context, query.vaultId, z.string().uuid().parse(noteId)));
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  try {
    const context = await getRequestContext();
    const { noteId } = await params;
    const body: unknown = await request.json();
    const fields = typeof body === "object" && body !== null ? body : {};
    return Response.json(await notes.saveNote(context, { ...fields, noteId }));
  } catch (error) {
    return apiError(error);
  }
}
