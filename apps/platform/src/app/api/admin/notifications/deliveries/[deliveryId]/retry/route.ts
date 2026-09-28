import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { createCorrelationId, portalRouteError, portalRouteSuccess } from "@/lib/api/PortalApiResponse";
import { notificationDeliveryIdSchema, notificationDeliveryRetrySchema } from "@/modules/notifications/api/NotificationAdministrationSchemas";
import { retryNotificationDelivery } from "@/modules/notifications/application/ServerNotificationAdministrationService";

type Context = { params: Promise<{ deliveryId: string }> };

export async function POST(request: Request, context: Context) {
  const correlationId = createCorrelationId();
  try {
    const { deliveryId } = await context.params;
    const id = notificationDeliveryIdSchema.parse(deliveryId);
    const input = notificationDeliveryRetrySchema.parse(await request.json());
    return portalRouteSuccess(
      await retryNotificationDelivery(
        await resolveUserFromHeaders(request.headers),
        id,
        input,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
