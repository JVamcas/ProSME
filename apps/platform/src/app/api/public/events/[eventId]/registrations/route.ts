import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eventRegistrationSchema } from "@/modules/content/api/EventRegistrationSchemas";
import { registerForEvent } from "@/modules/content/application/ServerEventRegistrationService";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();

  try {
    const { eventId } = await context.params;
    const input = eventRegistrationSchema.parse(await request.json());
    const receipt = await registerForEvent(eventId, input);
    return portalRouteSuccess(receipt, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
