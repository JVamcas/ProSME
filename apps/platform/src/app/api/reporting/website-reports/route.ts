import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { websiteReportListSchema } from "@/modules/reporting/api/WebsiteReportSchemas";
import { getSavedWebsiteReports } from "@/modules/reporting/ServerWebsiteReportService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = websiteReportListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return portalRouteSuccess(
      await getSavedWebsiteReports(user, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
