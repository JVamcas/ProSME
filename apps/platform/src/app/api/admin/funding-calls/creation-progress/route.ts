import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { fundingCallCreationProgressSaveSchema } from "@/modules/funding-calls/api/FundingCallSchemas";
import {
  getFundingCallCreationProgress,
  saveFundingCallCreationProgressForUser,
} from "@/modules/funding-calls/application/ServerFundingCallCreationProgressService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await getFundingCallCreationProgress(
        await resolveUserFromHeaders(request.headers),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PUT(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = fundingCallCreationProgressSaveSchema.parse(
      await request.json(),
    );
    return portalRouteSuccess(
      await saveFundingCallCreationProgressForUser(
        await resolveUserFromHeaders(request.headers),
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
