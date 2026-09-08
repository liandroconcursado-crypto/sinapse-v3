import { getRequestContext } from "@/server/auth/context";
import { apiError } from "@/server/http/api-error";
import { NoteService } from "@/server/services/notes/note-service";

const notes = new NoteService();

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    return Response.json(await notes.saveNote(context, await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
