import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { applicantProfileUpdateSchema } from "@/modules/profiles/ProfileSchemas";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  getApplicantProfile,
  updateApplicantProfile,
} from "@/modules/profiles/ServerProfileService";



export async function GET(request: Request) {
  const correlationId = createCorrelationId();

  try {
    const user = await resolveUserFromHeaders(request.headers);
    const profile = await getApplicantProfile(user);
    return portalRouteSuccess(profile, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request) {
  const correlationId = createCorrelationId();

  try {
    const user = await resolveUserFromHeaders(request.headers);
    const body = await request.json().catch(() => undefined);
    const input = applicantProfileUpdateSchema.parse(body);
    const profile = await updateApplicantProfile(user, input);
    return portalRouteSuccess(profile, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
