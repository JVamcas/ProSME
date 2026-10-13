import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getConfiguredFormPreview } from "@/modules/forms/application/ServerFormConfigurationService";

export async function GET(
  request: Request,
  context: { params: Promise<{ versionId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { versionId } = z
      .object({ versionId: z.uuid() })
      .parse(await context.params);
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await getConfiguredFormPreview(user, versionId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
