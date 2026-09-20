import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getPublishedFormPreview } from "@/modules/forms/application/ServerFormsService";

export async function GET(
  request: Request,
  context: { params: Promise<{ versionId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { versionId } = await context.params;
    return portalRouteSuccess(
      await getPublishedFormPreview(
        await resolveUserFromHeaders(request.headers),
        z.uuid().parse(versionId),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
