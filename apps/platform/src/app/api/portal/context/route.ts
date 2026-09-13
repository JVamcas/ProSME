import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  profileRouteError,
  profileRouteSuccess,
} from "@/modules/profiles/profile-route";
import { createApplicantPortalContext } from "@/modules/profiles/profile.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();

  try {
    const user = await resolveUserFromHeaders(request.headers);
    const context = createApplicantPortalContext(user);
    return profileRouteSuccess(context, correlationId);
  } catch (error) {
    return profileRouteError(error, correlationId);
  }
}
