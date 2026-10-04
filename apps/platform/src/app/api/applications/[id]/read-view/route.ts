import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getOwnApplicationReadView } from "@/modules/applications/ServerApplicationReadViewService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
    ]);
    const data = await getOwnApplicationReadView(
      user,
      z.uuid().parse(params.id),
      correlationId,
    );
    return portalRouteSuccess(data, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
