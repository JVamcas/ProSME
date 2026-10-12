import { eventIdSchema } from "@/modules/content/api/EventRegistrationSchemas";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getEventOperationsOverview } from "@/modules/content/application/ServerEventOperationsService";

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const eventId = eventIdSchema.parse((await context.params).eventId);
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await getEventOperationsOverview(user, eventId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
