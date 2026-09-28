import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getNotificationChannels } from "@/modules/notifications/application/ServerNotificationTemplateService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await getNotificationChannels(
        await resolveUserFromHeaders(request.headers),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
