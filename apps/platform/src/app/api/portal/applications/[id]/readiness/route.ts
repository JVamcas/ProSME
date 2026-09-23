import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getOwnApplicationReadiness } from "@/modules/applications/application/ServerApplicationReadinessService";

type ReadinessRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, route: ReadinessRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      route.params,
    ]);
    const readiness = await getOwnApplicationReadiness(
      user,
      z.uuid().parse(parameters.id),
    );
    return portalRouteSuccess(readiness, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
