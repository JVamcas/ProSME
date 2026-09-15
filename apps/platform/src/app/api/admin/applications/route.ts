import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { adminApplicationListSchema } from "@/modules/applications/AdminApplicationSchemas";
import { listAdminApplications } from "@/modules/applications/ServerAdminApplicationService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = adminApplicationListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const page = await listAdminApplications(user, input);
    return portalListRouteSuccess(page.items, correlationId, {
      nextCursor: page.nextCursor,
      total: page.total,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
