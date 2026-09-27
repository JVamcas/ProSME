import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  respondToWorkflowRfi,
  saveWorkflowRfiDraft,
} from "@/modules/workflows/application/runtime/ServerWorkflowRfiService";
import { getOwnedWorkflowRfi } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

const parametersSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
});
const draftSchema = z.object({
  expectedRowVersion: z.number().int().nonnegative(),
  fieldValues: z.record(z.string(), z.unknown()),
}).strict();
const responseSchema = z.object({
  evidenceVersionIds: z.array(z.uuid()).max(100),
  expectedRowVersion: z.number().int().positive(),
  fieldValues: z.record(z.string(), z.unknown()),
}).strict();

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params.then((value) => parametersSchema.parse(value)),
    ]);
    return portalRouteSuccess(
      await getOwnedWorkflowRfi(
        user,
        parameters.id,
        parameters.requestId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters, input] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params.then((value) => parametersSchema.parse(value)),
      request.json().then((value) => draftSchema.parse(value)),
    ]);
    await getOwnedWorkflowRfi(user, parameters.id, parameters.requestId);
    return portalRouteSuccess(
      await saveWorkflowRfiDraft(user, {
        ...input,
        requestInformationId: parameters.requestId,
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters, input] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params.then((value) => parametersSchema.parse(value)),
      request.json().then((value) => responseSchema.parse(value)),
    ]);
    await getOwnedWorkflowRfi(user, parameters.id, parameters.requestId);
    return portalRouteSuccess(
      await respondToWorkflowRfi(user, {
        ...input,
        correlationId,
        idempotencyKey: z.uuid().parse(
          request.headers.get("Idempotency-Key"),
        ),
        requestInformationId: parameters.requestId,
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
