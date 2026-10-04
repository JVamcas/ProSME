import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { documentDownloadResponse } from "@/lib/api/DocumentDownloadResponse";
import { createWorkflowTaskDocumentDownload } from "@/modules/work-queue/application/ServerWorkflowTaskDocumentService";

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
    const download = await createWorkflowTaskDocumentDownload(
      user,
      parameters.id,
      parameters.versionId,
    );
    return documentDownloadResponse(download);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
