import { heatmapBatchSchema } from "@/modules/reporting/api/WebsiteHeatmapSchemas";
import { collectWebsiteHeatmap } from "@/modules/reporting/ServerWebsiteHeatmapService";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new RequestValidationError("A JSON heatmap batch is required.");
    }
    // Bound chunked requests as well as requests with Content-Length.
    const reader = request.body?.getReader();
    if (!reader)
      throw new RequestValidationError("A heatmap batch is required.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        throw new RequestValidationError("The heatmap batch is too large.");
      }
      chunks.push(value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new RequestValidationError(
        "A valid JSON heatmap batch is required.",
      );
    }
    const input = heatmapBatchSchema.parse(body);
    await collectWebsiteHeatmap(
      input,
      request.headers,
      new URL(request.url).origin,
    );
    return portalRouteSuccess({ accepted: true }, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
