import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getOwnApplicationStatusHistory } from "@/modules/applications/ServerApplicationStatusHistoryService";

type RouteContext = { params: Promise<{ id: string }> };
const querySchema = z.object({
  after: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
    ]);
    const url = new URL(request.url);
    const query = querySchema.parse({
      after: url.searchParams.get("after") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    return portalRouteSuccess(
      await getOwnApplicationStatusHistory(user, z.uuid().parse(params.id), {
        after: query.after,
        limit: query.limit,
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
