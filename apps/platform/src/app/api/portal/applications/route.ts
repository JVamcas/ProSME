import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  applicationListSchema,
  createApplicationDraftSchema,
} from "@/modules/applications/ApplicationSchemas";
import { createApplicationDraft } from "@/modules/applications/ServerApplicationFormService";
import {
  listOwnApplications,
} from "@/modules/applications/ServerApplicationService";
import { z } from "zod";



export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const url = new URL(request.url);
    const input = applicationListSchema.parse(Object.fromEntries(url.searchParams));
    const result = await listOwnApplications(user, input);
    return portalListRouteSuccess(result.items, correlationId, {
      counts: result.counts,
      nextCursor: result.nextCursor,
      total: result.total,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const body = await request.json().catch(() => undefined);
    const input = createApplicationDraftSchema.parse(body);
    const idempotencyKey = z.uuid().parse(
      request.headers.get("Idempotency-Key"),
    );
    return portalRouteSuccess(
      await createApplicationDraft(user, {
        ...input,
        correlationId,
        idempotencyKey,
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
