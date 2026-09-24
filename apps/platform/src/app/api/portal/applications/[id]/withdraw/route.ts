import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { applicationWithdrawalSchema } from "@/modules/applications/api/ApplicationWithdrawalSchemas";
import { withdrawApplication } from "@/modules/applications/ServerApplicationWithdrawalService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.json(),
    ]);
    const applicationId = z.uuid().parse(params.id);
    const command = applicationWithdrawalSchema.parse(body);
    return portalRouteSuccess(
      await withdrawApplication(
        user,
        applicationId,
        command,
        request.headers.get("Idempotency-Key"),
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
