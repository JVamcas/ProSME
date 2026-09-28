import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { createCorrelationId, portalRouteError, portalRouteSuccess } from "@/lib/api/PortalApiResponse";
import { getNotificationEventRules } from "@/modules/notifications/application/ServerNotificationAdministrationService";
import { notificationEventRuleListQuerySchema } from "@/modules/notifications/api/NotificationAdministrationSchemas";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const url = new URL(request.url);
    return portalRouteSuccess(
      await getNotificationEventRules(
        await resolveUserFromHeaders(request.headers),
        notificationEventRuleListQuerySchema.parse(
          Object.fromEntries(url.searchParams.entries()),
        ),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
