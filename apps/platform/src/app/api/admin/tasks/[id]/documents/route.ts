import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { RequestValidationError } from "@/lib/resource-errors";
import { uploadWorkflowTaskDocument } from "@/modules/work-queue/ServerWorkflowTaskDocumentService";
import { taskInstanceIdSchema } from "@/modules/work-queue/WorkQueueSchemas";

const requirementIdSchema = z.uuid();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters, form] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.formData(),
    ]);
    const requirementId = form.get("requirementId");
    const file = form.get("file");
    if (typeof requirementId !== "string" || !(file instanceof File)) {
      throw new RequestValidationError(
        "Select a document requirement and file to upload.",
      );
    }
    return portalRouteSuccess(
      await uploadWorkflowTaskDocument(
        user,
        taskInstanceIdSchema.parse(parameters.id),
        requirementIdSchema.parse(requirementId),
        file,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
