import {
  eventIdSchema,
  eventParticipantQuerySchema,
} from "@/modules/content/api/EventRegistrationSchemas";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getEventOperationsParticipants } from "@/modules/content/application/ServerEventOperationsService";

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const eventId = eventIdSchema.parse((await context.params).eventId);
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await getEventOperationsParticipants(
        user,
        eventId,
        eventParticipantQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
