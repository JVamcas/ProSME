import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { heatmapQuerySchema } from "@/modules/reporting/api/WebsiteHeatmapSchemas";
import { getWebsiteHeatmap } from "@/modules/reporting/ServerWebsiteHeatmapService";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const query = heatmapQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return portalRouteSuccess(
      await getWebsiteHeatmap(user, query),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
