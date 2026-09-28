import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { fundingCallLifecycleCommandSchema } from "@/modules/funding-calls/api/FundingCallSchemas";
import { changeFundingCallLifecycleStatus } from "@/modules/funding-calls/application/ServerFundingCallLifecycleService";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const id = idSchema.parse((await context.params).id);
    const input = fundingCallLifecycleCommandSchema.parse(await request.json());
    return portalRouteSuccess(
      await changeFundingCallLifecycleStatus(
        await resolveUserFromHeaders(request.headers),
        id,
        input,
        request.headers.get("Idempotency-Key")?.trim() || correlationId,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
