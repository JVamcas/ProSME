import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getPublishedForms } from "@/modules/forms/application/ServerFormsService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await getPublishedForms(await resolveUserFromHeaders(request.headers)),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
