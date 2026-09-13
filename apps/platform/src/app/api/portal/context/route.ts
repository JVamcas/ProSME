import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { createApplicantPortalContext } from "@/modules/profiles/ServerProfileService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();

  try {
    const user = await resolveUserFromHeaders(request.headers);
    const context = createApplicantPortalContext(user);
    return portalRouteSuccess(context, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
