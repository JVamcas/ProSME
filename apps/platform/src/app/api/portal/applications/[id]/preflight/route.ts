import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { preflightOwnApplication } from "@/modules/applications/application/ServerApplicationPreflightService";

type PreflightRouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, route: PreflightRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      route.params,
    ]);
    const result = await preflightOwnApplication(
      user,
      z.uuid().parse(parameters.id),
    );
    return portalRouteSuccess(result, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
