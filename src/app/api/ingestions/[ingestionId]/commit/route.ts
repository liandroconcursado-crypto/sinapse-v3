import { z } from "zod";
import { getRequestContext } from "@/server/auth/context";
import { apiError } from "@/server/http/api-error";
import { IngestionService } from "@/server/services/ingestion/ingestion-service";

const ingestions = new IngestionService();

export async function POST(request: Request, { params }: { params: Promise<{ ingestionId: string }> }) {
  try {
    const context = await getRequestContext();
    const { ingestionId } = await params;
    return Response.json(await ingestions.commit(context, z.string().uuid().parse(ingestionId), await request.json()));
  } catch (error) {
    return apiError(error);
  }
}
