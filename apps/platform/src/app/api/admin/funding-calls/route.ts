import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  fundingCallCreateSchema,
  fundingCallListSchema,
} from "@/modules/funding-calls/api/FundingCallSchemas";
import {
  createFundingCall,
  listFundingCalls,
} from "@/modules/funding-calls/application/ServerFundingCallService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = fundingCallListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const page = await listFundingCalls(
      await resolveUserFromHeaders(request.headers),
      input,
    );
    return portalListRouteSuccess(page.items, correlationId, {
      nextCursor: page.page < page.totalPages ? String(page.page + 1) : null,
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = fundingCallCreateSchema.parse(await request.json());
    return portalRouteSuccess(
      await createFundingCall(
        await resolveUserFromHeaders(request.headers),
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

