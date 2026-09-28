import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { documentDownloadResponse } from "@/lib/api/DocumentDownloadResponse";
import { createCorrelationId, portalRouteError } from "@/lib/api/PortalApiResponse";
import { createAdminApplicationDocumentDownload } from "@/modules/applications/ServerAdminApplicationDocumentService";

type DownloadRouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

const routeParametersSchema = z.object({
  id: z.uuid(),
  versionId: z.uuid(),
});

export async function GET(request: Request, route: DownloadRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      route.params.then((value) => routeParametersSchema.parse(value)),
    ]);
    const download = await createAdminApplicationDocumentDownload(
      user,
      parameters.id,
      parameters.versionId,
    );
    return documentDownloadResponse(download);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
