import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { deleteOwnApplicationDraft } from "@/modules/applications/ServerApplicationDeletionService";
import { saveApplicationDraftSchema } from "@/modules/applications/ApplicationSchemas";
import {
  getOwnApplicationDraft,
  saveOwnApplicationDraft,
} from "@/modules/applications/ServerApplicationFormService";

type ApplicationRouteContext = { params: Promise<{ id: string }> };
const applicationIdSchema = z.uuid();

async function context(request: Request, route: ApplicationRouteContext) {
  const [user, params] = await Promise.all([
    resolveUserFromHeaders(request.headers),
    route.params,
  ]);
  return { id: applicationIdSchema.parse(params.id), user };
}

export async function GET(request: Request, route: ApplicationRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const resolved = await context(request, route);
    return portalRouteSuccess(
      await getOwnApplicationDraft(resolved.user, resolved.id),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request, route: ApplicationRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const resolved = await context(request, route);
    const body = await request.json().catch(() => undefined);
    const input = saveApplicationDraftSchema.parse(body);
    return portalRouteSuccess(
      await saveOwnApplicationDraft(resolved.user, resolved.id, {
        ...input,
        correlationId,
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function DELETE(request: Request, route: ApplicationRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const resolved = await context(request, route);
    return portalRouteSuccess(
      await deleteOwnApplicationDraft(resolved.user, resolved.id, correlationId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
