import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityInputCreateSchema } from "@/modules/eligibility/api/EligibilityInputSchemas";
import {
  addEligibilityInput,
  getEligibilityInputs,
} from "@/modules/eligibility/application/ServerEligibilityInputService";

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const { id, versionId } = await context.params;
    return portalRouteSuccess(
      await getEligibilityInputs(
        await resolveUserFromHeaders(request.headers),
        id,
        versionId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityInputCreateSchema.parse(await request.json());
    const { id, versionId } = await context.params;
    return portalRouteSuccess(
      await addEligibilityInput(
        await resolveUserFromHeaders(request.headers),
        id,
        versionId,
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
