import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { recordWorkflowQuorumParticipation } from
  "@/modules/workflows/application/runtime/ServerWorkflowQuorumService";

const participationSchema = z.object({
  userId: z.uuid(),
  responsibility: z.string().trim().min(1).max(120),
  isChair: z.boolean(),
  attendance: z.enum(["PRESENT", "ABSENT", "RECUSED"]),
  abstained: z.boolean(),
}).strict();

export async function PUT(
  request: Request,
  context: { params: Promise<{ stageId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.json().catch(() => undefined),
    ]);
    const input = participationSchema.parse(body);
    return portalRouteSuccess(
      await recordWorkflowQuorumParticipation(user, {
        ...input,
        stageInstanceId: z.uuid().parse(params.stageId),
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
