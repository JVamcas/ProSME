import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { updateApplicationSchema } from "@/modules/applications/ApplicationSchemas";
import {
  getOwnApplication,
  updateOwnApplication,
} from "@/modules/applications/ServerApplicationService";

type ApplicationRouteContext = { params: Promise<{ id: string }> };
const applicationIdSchema = z.uuid();

async function context(request: Request, route: ApplicationRouteContext) {
  const [user, params] = await Promise.all([
    resolveUserFromHeaders(request.headers),
    route.params,
  ]);
  return { id: applicationIdSchema.parse(params.id), user };
}

export async function GET(request: Request, route: ApplicationRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const resolved = await context(request, route);
    return portalRouteSuccess(
      await getOwnApplication(resolved.user, resolved.id),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request, route: ApplicationRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const resolved = await context(request, route);
    const body = await request.json().catch(() => undefined);
    const input = updateApplicationSchema.parse(body);
    return portalRouteSuccess(
      await updateOwnApplication(resolved.user, resolved.id, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
