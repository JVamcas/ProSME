import {
  eventIdSchema,
  eventRegistrationSettingsSchema,
} from "@/modules/content/api/EventRegistrationSchemas";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { updateEventRegistrationSettings } from "@/modules/content/application/ServerEventRegistrationService";

export async function PUT(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const eventId = eventIdSchema.parse((await context.params).eventId);
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await updateEventRegistrationSettings(
        user,
        eventId,
        eventRegistrationSettingsSchema.parse(await request.json()),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
