import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { createCorrelationId, portalRouteError, portalRouteSuccess } from "@/lib/api/PortalApiResponse";
import { getNotificationEventRule, updateNotificationEventRule } from "@/modules/notifications/application/ServerNotificationAdministrationService";
import { notificationEventRuleUpdateSchema } from "@/modules/notifications/api/NotificationAdministrationSchemas";

type Context = { params: Promise<{ eventKey: string }> };

export async function GET(request: Request, context: Context) {
  const correlationId = createCorrelationId();
  try {
    const { eventKey } = await context.params;
    return portalRouteSuccess(
      await getNotificationEventRule(
        await resolveUserFromHeaders(request.headers),
        decodeURIComponent(eventKey),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request, context: Context) {
  const correlationId = createCorrelationId();
  try {
    const { eventKey } = await context.params;
    const input = notificationEventRuleUpdateSchema.parse(await request.json());
    return portalRouteSuccess(
      await updateNotificationEventRule(
        await resolveUserFromHeaders(request.headers),
        decodeURIComponent(eventKey),
        input,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
