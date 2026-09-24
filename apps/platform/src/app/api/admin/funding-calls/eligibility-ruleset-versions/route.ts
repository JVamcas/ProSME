import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { listBindableEligibilityRuleSetVersions } from "@/modules/funding-calls/application/ServerFundingCallService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await listBindableEligibilityRuleSetVersions(
        await resolveUserFromHeaders(request.headers),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
