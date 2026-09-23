import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getApplicationSubmissionSnapshot } from "@/modules/applications/ServerApplicationSubmissionSnapshotService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
    ]);
    return portalRouteSuccess(
      await getApplicationSubmissionSnapshot(
        user,
        z.uuid().parse(params.id),
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
