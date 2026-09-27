import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { closeWorkflowRfi } from "@/modules/workflows/application/runtime/ServerWorkflowRfiService";
import { getTaskWorkflowRfi } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

const parametersSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
});
const inputSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
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
      await closeWorkflowRfi(user, {
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
