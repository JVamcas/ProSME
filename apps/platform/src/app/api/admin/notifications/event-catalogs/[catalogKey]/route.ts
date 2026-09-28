import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { createCorrelationId, portalRouteError, portalRouteSuccess } from "@/lib/api/PortalApiResponse";
import { getNotificationCatalog, updateNotificationCatalog } from "@/modules/notifications/application/ServerNotificationAdministrationService";
import { notificationCatalogUpdateSchema } from "@/modules/notifications/api/NotificationAdministrationSchemas";

type Context = { params: Promise<{ catalogKey: string }> };

export async function GET(request: Request, context: Context) {
  const correlationId = createCorrelationId();
  try {
    const { catalogKey } = await context.params;
    return portalRouteSuccess(
      await getNotificationCatalog(
        await resolveUserFromHeaders(request.headers),
        decodeURIComponent(catalogKey),
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
    const { catalogKey } = await context.params;
    const input = notificationCatalogUpdateSchema.parse(await request.json());
    return portalRouteSuccess(
      await updateNotificationCatalog(
        await resolveUserFromHeaders(request.headers),
        decodeURIComponent(catalogKey),
        input,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
