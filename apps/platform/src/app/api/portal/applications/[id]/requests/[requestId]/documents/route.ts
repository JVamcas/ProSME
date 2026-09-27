import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { RequestValidationError } from "@/lib/resource-errors";
import { uploadOwnedWorkflowRfiDocument } from "@/modules/workflows/application/runtime/ServerWorkflowRfiEvidenceService";

const parametersSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters, form] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params.then((value) => parametersSchema.parse(value)),
      request.formData(),
    ]);
    const requirementId = form.get("requirementId");
    const file = form.get("file");
    if (typeof requirementId !== "string" || !(file instanceof File)) {
      throw new RequestValidationError(
        "Select a requested document and file to upload.",
      );
    }
    return portalRouteSuccess(
      await uploadOwnedWorkflowRfiDocument(
        user,
        parameters.id,
        parameters.requestId,
        z.uuid().parse(requirementId),
        file,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
