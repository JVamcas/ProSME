import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { websiteScheduleUpdateSchema } from "@/modules/reporting/api/WebsiteReportSchemas";
import { saveWebsiteReportSchedule } from "@/modules/reporting/ServerWebsiteReportService";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ scheduleId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { scheduleId } = await context.params;
    const input = websiteScheduleUpdateSchema.parse(await request.json());
    return portalRouteSuccess(
      await saveWebsiteReportSchedule(user, scheduleId, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
