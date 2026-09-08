import { z } from "zod";
import { getRequestContext } from "@/server/auth/context";
import { apiError } from "@/server/http/api-error";
import { ExportService } from "@/server/services/export/export-service";

const exporter = new ExportService();

export async function GET(request: Request) {
  try {
    const context = await getRequestContext();
    const vaultId = z.string().uuid().parse(new URL(request.url).searchParams.get("vaultId"));
    const zip = await exporter.createZip(context, vaultId);
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="sinapse-vault.zip"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
