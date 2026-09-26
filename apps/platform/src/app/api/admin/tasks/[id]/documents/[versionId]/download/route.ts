import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { createWorkflowTaskDocumentDownload } from "@/modules/work-queue/ServerWorkflowTaskDocumentService";

const parametersSchema = z.object({
  id: z.uuid(),
  versionId: z.uuid(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; versionId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params.then((value) => parametersSchema.parse(value)),
    ]);
    const url = await createWorkflowTaskDocumentDownload(
      user,
      parameters.id,
      parameters.versionId,
    );
    return Response.redirect(url, 303);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
