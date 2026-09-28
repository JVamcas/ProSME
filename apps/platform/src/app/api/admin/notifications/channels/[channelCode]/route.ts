import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { notificationChannelCodeSchema } from "@/modules/notifications/api/NotificationTemplateSchemas";
import { getNotificationChannel } from "@/modules/notifications/application/ServerNotificationTemplateService";

export async function GET(
  request: Request,
  context: { params: Promise<{ channelCode: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { channelCode } = await context.params;
    return portalRouteSuccess(
      await getNotificationChannel(
        await resolveUserFromHeaders(request.headers),
        notificationChannelCodeSchema.parse(channelCode),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
