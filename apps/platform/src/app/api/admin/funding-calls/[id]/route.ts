import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { fundingCallUpdateSchema } from "@/modules/funding-calls/api/FundingCallSchemas";
import { z } from "zod";
import {
  getFundingCall,
  updateFundingCall,
} from "@/modules/funding-calls/application/ServerFundingCallService";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const id = idSchema.parse((await context.params).id);
    return portalRouteSuccess(
      await getFundingCall(
        await resolveUserFromHeaders(request.headers),
        id,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const input = fundingCallUpdateSchema.parse(await request.json());
    const id = idSchema.parse((await context.params).id);
    return portalRouteSuccess(
      await updateFundingCall(
        await resolveUserFromHeaders(request.headers),
        id,
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
