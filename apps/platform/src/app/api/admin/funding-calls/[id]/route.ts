import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { fundingCallUpdateSchema } from "@/modules/funding-calls/api/FundingCallSchemas";
import { z } from "zod";
import {
  deleteFundingCall,
  getFundingCall,
  updateFundingCall,
} from "@/modules/funding-calls/application/ServerFundingCallService";

import { getFundingCallVersion } from "@/modules/funding-calls/application/ServerFundingCallVersionService";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const id = idSchema.parse((await context.params).id);
    const user = await resolveUserFromHeaders(request.headers);
    const selected = new URL(request.url).searchParams.get("versionId");
    const call = selected
      ? await getFundingCallVersion(user, id, idSchema.parse(selected))
      : await getFundingCall(user, id);
    return portalRouteSuccess(call, correlationId);
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

export async function DELETE(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const id = idSchema.parse((await context.params).id);
    return portalRouteSuccess(
      await deleteFundingCall(
        await resolveUserFromHeaders(request.headers),
        id,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
