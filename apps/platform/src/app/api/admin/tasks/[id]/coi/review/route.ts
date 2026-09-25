import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  getPendingWorkflowTaskCoiDisclosure,
} from "@/modules/workflows/application/runtime/ServerWorkflowCoiService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
    ]);
    return portalRouteSuccess(
      await getPendingWorkflowTaskCoiDisclosure(
        user,
        z.uuid().parse(params.id),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

