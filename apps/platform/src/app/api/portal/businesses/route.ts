import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createBusiness,
  listApplicationBusinesses,
  listBusinesses,
} from "@/modules/businesses/ServerBusinessService";
import { businessProfileSchema } from "@/modules/businesses/BusinessSchemas";
import { z } from "zod";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";



const applicationScopeSchema = z.object({
  applicationId: z.uuid(),
  fundingOpportunityId: z.uuid(),
});

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const parameters = Object.fromEntries(new URL(request.url).searchParams);
    const scoped = applicationScopeSchema.safeParse(parameters);
    const businesses = scoped.success
      ? await listApplicationBusinesses(user, scoped.data)
      : await listBusinesses(user);
    return portalRouteSuccess(businesses, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const body = await request.json().catch(() => undefined);
    const input = businessProfileSchema.parse(body);
    return portalRouteSuccess(await createBusiness(user, input), correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
