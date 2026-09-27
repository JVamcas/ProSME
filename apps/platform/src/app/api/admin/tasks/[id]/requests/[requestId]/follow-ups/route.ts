import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { addWorkflowRfiFollowUp } from "@/modules/workflows/application/runtime/ServerWorkflowRfiService";
import { getTaskWorkflowRfi } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

const parametersSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
});
const inputSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
}).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters, input] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params.then((value) => parametersSchema.parse(value)),
      request.json().then((value) => inputSchema.parse(value)),
    ]);
    await getTaskWorkflowRfi(user, parameters.id, parameters.requestId);
    return portalRouteSuccess(
      await addWorkflowRfiFollowUp(user, parameters.id, {
        ...input,
        correlationId,
        requestInformationId: parameters.requestId,
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
