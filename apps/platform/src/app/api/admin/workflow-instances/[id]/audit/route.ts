import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getRuntimeAuditTrail } from "@/modules/workflows/application/runtime/ServerRuntimeAuditService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    return portalRouteSuccess(
      await getRuntimeAuditTrail(user, z.uuid().parse(id)),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
