import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { replaceReviewer } from
  "@/modules/workflows/application/runtime/ServerWorkflowReviewerReplacementService";

const replacementSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
  replacementUserId: z.uuid(),
  reason: z.string().trim().min(10).max(1000),
}).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.json().catch(() => undefined),
    ]);
    const input = replacementSchema.parse(body);
    return portalRouteSuccess(
      await replaceReviewer(user, {
        ...input,
        correlationId,
        idempotencyKey: z.uuid().parse(
          request.headers.get("Idempotency-Key"),
        ),
        taskId: z.uuid().parse(params.id),
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
