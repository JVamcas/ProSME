import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  applicationListSchema,
  createApplicationSchema,
} from "@/modules/applications/ApplicationSchemas";
import {
  createApplication,
  listOwnApplications,
} from "@/modules/applications/ServerApplicationService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const url = new URL(request.url);
    const input = applicationListSchema.parse(Object.fromEntries(url.searchParams));
    const result = await listOwnApplications(user, input);
    return portalListRouteSuccess(result.items, correlationId, {
      counts: result.counts,
      nextCursor: result.nextCursor,
      total: result.total,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const body = await request.json().catch(() => undefined);
    const input = createApplicationSchema.parse(body);
    return portalRouteSuccess(
      await createApplication(user, input.fundingOpportunityId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
