import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { applicationSubmissionCommandSchema } from "@/modules/applications/api/ApplicationSubmissionSchemas";
import { submitApplication } from "@/modules/applications/ServerApplicationSubmissionService";

type SubmitRouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, route: SubmitRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      route.params,
      request.json(),
    ]);
    const result = await submitApplication(
      user,
      z.uuid().parse(params.id),
      applicationSubmissionCommandSchema.parse(body),
      request.headers.get("Idempotency-Key"),
      correlationId,
    );
    return portalRouteSuccess(result, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
