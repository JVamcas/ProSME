import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  taskFormCompletionSchema,
  taskFormSubmissionSchema,
} from "@/modules/forms/FormSchemas";
import { z } from "zod";
import {
  completeTaskForm,
  getTaskForm,
  saveTaskForm,
} from "@/modules/forms/ServerFormsService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { id } = await context.params;
    return portalRouteSuccess(
      await getTaskForm(
        await resolveUserFromHeaders(request.headers),
        id,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { id } = await context.params;
    const input = taskFormSubmissionSchema.parse(await request.json());
    return portalRouteSuccess(
      await saveTaskForm(
        await resolveUserFromHeaders(request.headers),
        { ...input, taskInstanceId: id },
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { id } = await context.params;
    const input = taskFormCompletionSchema.parse(await request.json());
    const idempotencyKey = z.uuid().parse(request.headers.get("Idempotency-Key"));
    return portalRouteSuccess(
      await completeTaskForm(
        await resolveUserFromHeaders(request.headers),
        { ...input, correlationId, idempotencyKey, taskInstanceId: id },
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
