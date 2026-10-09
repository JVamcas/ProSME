import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  getFundingCallVersions,
  prepareFundingCallReplacement,
} from "@/modules/funding-calls/application/ServerFundingCallVersionService";

const commandSchema = z
  .object({ expectedRowVersion: z.number().int().positive() })
  .strict();
const pageSchema = z.coerce.number().int().positive().default(1);
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const id = z.uuid().parse((await context.params).id);
    const page = pageSchema.parse(
      new URL(request.url).searchParams.get("page") ?? undefined,
    );
    return portalRouteSuccess(
      await getFundingCallVersions(
        await resolveUserFromHeaders(request.headers),
        id,
        page,
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
    const id = z.uuid().parse((await context.params).id);
    const input = commandSchema.parse(await request.json());
    return portalRouteSuccess(
      await prepareFundingCallReplacement(
        await resolveUserFromHeaders(request.headers),
        id,
        input.expectedRowVersion,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
