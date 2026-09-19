import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { z } from "zod";
import { clonePublishedForm } from "@/modules/forms/application/ServerFormsService";

const inputSchema = z.object({ sourceVersionId: z.string().uuid() });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { id } = await context.params;
    const { sourceVersionId } = inputSchema.parse(await request.json());
    return portalRouteSuccess(
      await clonePublishedForm(
        await resolveUserFromHeaders(request.headers),
        id,
        sourceVersionId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
