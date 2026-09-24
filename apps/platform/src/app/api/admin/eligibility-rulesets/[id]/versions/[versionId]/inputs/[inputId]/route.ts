import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  eligibilityInputDeleteSchema,
  eligibilityInputUpdateSchema,
} from "@/modules/eligibility/api/EligibilityInputSchemas";
import {
  editEligibilityInput,
  removeEligibilityInput,
} from "@/modules/eligibility/application/ServerEligibilityInputService";

type RouteContext = {
  params: Promise<{ id: string; inputId: string; versionId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityInputUpdateSchema.parse(await request.json());
    const { id, inputId, versionId } = await context.params;
    return portalRouteSuccess(
      await editEligibilityInput(
        await resolveUserFromHeaders(request.headers),
        id,
        versionId,
        inputId,
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityInputDeleteSchema.parse(await request.json());
    const { id, inputId, versionId } = await context.params;
    return portalRouteSuccess(
      await removeEligibilityInput(
        await resolveUserFromHeaders(request.headers),
        id,
        versionId,
        inputId,
        input.expectedRowVersion,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
