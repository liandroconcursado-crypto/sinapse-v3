import { getRequestContext } from "@/server/auth/context";
import { apiError } from "@/server/http/api-error";
import { IngestionService } from "@/server/services/ingestion/ingestion-service";

const ingestions = new IngestionService();

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    return Response.json(await ingestions.createProposal(context, await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
