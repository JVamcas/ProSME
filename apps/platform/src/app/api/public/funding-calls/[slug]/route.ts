import { z } from "zod";

import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getPublicFundingCallBySlug } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

const paramsSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const correlationId = createCorrelationId();

  try {
    const { slug } = paramsSchema.parse(await context.params);
    return portalRouteSuccess(
      await getPublicFundingCallBySlug(slug),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
