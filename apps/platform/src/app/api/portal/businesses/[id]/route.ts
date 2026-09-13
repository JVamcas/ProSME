import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  deleteBusiness,
  getBusiness,
  updateBusiness,
} from "@/modules/businesses/ServerBusinessService";
import { businessProfileSchema } from "@/modules/businesses/BusinessSchemas";
import {
  createCorrelationId,
  profileRouteError,
  profileRouteSuccess,
} from "@/lib/api/PortalApiResponse";

type BusinessRouteContext = { params: Promise<{ id: string }> };
const businessIdSchema = z.uuid();

async function context(request: Request, route: BusinessRouteContext) {
  const [user, params] = await Promise.all([
    resolveUserFromHeaders(request.headers),
    route.params,
  ]);
  return { id: businessIdSchema.parse(params.id), user };
}

export async function GET(request: Request, route: BusinessRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const resolved = await context(request, route);
    return profileRouteSuccess(
      await getBusiness(resolved.user, resolved.id),
      correlationId,
    );
  } catch (error) {
    return profileRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request, route: BusinessRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const resolved = await context(request, route);
    const body = await request.json().catch(() => undefined);
    const input = businessProfileSchema.parse(body);
    return profileRouteSuccess(
      await updateBusiness(resolved.user, resolved.id, input),
      correlationId,
    );
  } catch (error) {
    return profileRouteError(error, correlationId);
  }
}

export async function DELETE(request: Request, route: BusinessRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const resolved = await context(request, route);
    await deleteBusiness(resolved.user, resolved.id);
    return profileRouteSuccess({ deleted: true }, correlationId);
  } catch (error) {
    return profileRouteError(error, correlationId);
  }
}
