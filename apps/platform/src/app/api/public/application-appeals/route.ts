import { applicationAppealSchema } from "@/modules/applications/api/ApplicationAppealSchemas";
import { submitApplicationAppeal } from "@/modules/applications/application/ServerApplicationAppealService";
import { readAppealBody } from "@/modules/applications/api/ApplicationAppealTransport";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await submitApplicationAppeal(
        applicationAppealSchema.parse(await readAppealBody(request)),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
