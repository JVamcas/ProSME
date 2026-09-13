import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { applicantProfileUpdateSchema } from "@/modules/profiles/profile.schemas";
import {
  createCorrelationId,
  profileRouteError,
  profileRouteSuccess,
} from "@/modules/profiles/profile-route";
import {
  getApplicantProfile,
  updateApplicantProfile,
} from "@/modules/profiles/profile.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();

  try {
    const user = await resolveUserFromHeaders(request.headers);
    const profile = await getApplicantProfile(user);
    return profileRouteSuccess(profile, correlationId);
  } catch (error) {
    return profileRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request) {
  const correlationId = createCorrelationId();

  try {
    const user = await resolveUserFromHeaders(request.headers);
    const body = await request.json().catch(() => undefined);
    const input = applicantProfileUpdateSchema.parse(body);
    const profile = await updateApplicantProfile(user, input);
    return profileRouteSuccess(profile, correlationId);
  } catch (error) {
    return profileRouteError(error, correlationId);
  }
}
