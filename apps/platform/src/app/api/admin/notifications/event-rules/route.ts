import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { createCorrelationId, portalRouteError, portalRouteSuccess } from "@/lib/api/PortalApiResponse";
import { getNotificationEventRules } from "@/modules/notifications/application/ServerNotificationAdministrationService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await getNotificationEventRules(await resolveUserFromHeaders(request.headers)),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
