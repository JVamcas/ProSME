import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { createCorrelationId, portalRouteError, portalRouteSuccess } from "@/lib/api/PortalApiResponse";
import { notificationDeliveryQuerySchema } from "@/modules/notifications/api/NotificationAdministrationSchemas";
import { getNotificationDeliveries } from "@/modules/notifications/application/ServerNotificationAdministrationService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const search = new URL(request.url).searchParams;
    const values = Object.fromEntries(
      [...search.entries()].filter(([, value]) => value.trim().length > 0),
    );
    const query = notificationDeliveryQuerySchema.parse(values);
    return portalRouteSuccess(
      await getNotificationDeliveries(
        await resolveUserFromHeaders(request.headers),
        query,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
