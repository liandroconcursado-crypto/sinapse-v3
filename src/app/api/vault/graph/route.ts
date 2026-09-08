import { z } from "zod";
import { getRequestContext } from "@/server/auth/context";
import { apiError } from "@/server/http/api-error";
import { GraphService } from "@/server/services/graph/graph-service";

const graph = new GraphService();

export async function GET(request: Request) {
  try {
    const context = await getRequestContext();
    const vaultId = z.string().uuid().parse(new URL(request.url).searchParams.get("vaultId"));
    return Response.json(await graph.project(context, vaultId));
  } catch (error) {
    return apiError(error);
  }
}
