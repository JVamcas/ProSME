import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createBusiness,
  listBusinesses,
} from "@/modules/businesses/ServerBusinessService";
import { businessProfileSchema } from "@/modules/businesses/BusinessSchemas";
import {
  createCorrelationId,
  profileRouteError,
  profileRouteSuccess,
} from "@/lib/api/PortalApiResponse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    return profileRouteSuccess(await listBusinesses(user), correlationId);
  } catch (error) {
    return profileRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const body = await request.json().catch(() => undefined);
    const input = businessProfileSchema.parse(body);
    return profileRouteSuccess(await createBusiness(user, input), correlationId);
  } catch (error) {
    return profileRouteError(error, correlationId);
  }
}
