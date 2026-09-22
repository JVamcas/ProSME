import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  authoritativeEligibilityCommandKeySchema,
  authoritativeEligibilityExecutionSchema,
  authoritativeEligibilityTaskIdSchema,
} from "@/modules/eligibility/api/AuthoritativeEligibilitySchemas";
import { executeAuthoritativeEligibility } from "@/modules/eligibility/application/ServerAuthoritativeEligibilityService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = authoritativeEligibilityExecutionSchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(
      await executeAuthoritativeEligibility(user, {
        ...input,
        correlationId,
        idempotencyKey: authoritativeEligibilityCommandKeySchema.parse(
          request.headers.get("Idempotency-Key"),
        ),
        taskId: authoritativeEligibilityTaskIdSchema.parse(id),
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
