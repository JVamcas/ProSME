import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { createCorrelationId, portalRouteError, portalRouteSuccess } from "@/lib/api/PortalApiResponse";
import { websiteAnalyticsQuerySchema } from "@/modules/reporting/api/WebsiteAnalyticsSchemas";
import { getWebsiteAnalytics } from "@/modules/reporting/ServerReportingService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = websiteAnalyticsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return portalRouteSuccess(await getWebsiteAnalytics(user, input), correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
