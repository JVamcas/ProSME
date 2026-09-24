import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { opportunityAssignmentSchema } from "@/modules/workflows/api/WorkflowSchemas";
import {
  assignOpportunityWorkflow,
  getWorkflowAssignments,
} from "@/modules/workflows/ServerWorkflowAssignmentService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await getWorkflowAssignments(user),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PUT(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = opportunityAssignmentSchema.parse(
      await request.json().catch(() => undefined),
    );
    const result = await assignOpportunityWorkflow(
      user,
      input,
      request.headers.get("Idempotency-Key"),
      correlationId,
    );
    return portalRouteSuccess(result, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
