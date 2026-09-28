import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { documentDownloadResponse } from "@/lib/api/DocumentDownloadResponse";
import {
  createCorrelationId,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { createOwnedWorkflowRfiDocumentDownload } from "@/modules/workflows/application/runtime/ServerWorkflowRfiEvidenceService";

const parametersSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  versionId: z.uuid(),
});

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string; requestId: string; versionId: string }>;
  },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params.then((value) => parametersSchema.parse(value)),
    ]);
    const download = await createOwnedWorkflowRfiDocumentDownload(
      user,
      parameters.id,
      parameters.requestId,
      parameters.versionId,
    );
    return documentDownloadResponse(download);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
