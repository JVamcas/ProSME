import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  readFundingCallThumbnail,
  removeFundingCallThumbnail,
  uploadFundingCallThumbnail,
} from "@/modules/funding-calls/application/ServerFundingCallThumbnailService";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.uuid();
const rowVersionSchema = z.coerce.number().int().positive();

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const thumbnail = await readFundingCallThumbnail(
      await resolveUserFromHeaders(request.headers),
      idSchema.parse((await context.params).id),
    );
    return new Response(new Uint8Array(thumbnail.body), {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Type": thumbnail.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, form, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      request.formData(),
      context.params,
    ]);
    const thumbnail = form.get("thumbnail");
    if (!(thumbnail instanceof File)) {
      throw new RequestValidationError("Choose a thumbnail to upload.");
    }
    return portalRouteSuccess(
      await uploadFundingCallThumbnail(
        user,
        idSchema.parse(params.id),
        rowVersionSchema.parse(form.get("expectedRowVersion")),
        thumbnail,
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
    const [user, input, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      request.json(),
      context.params,
    ]);
    const expectedRowVersion = z.object({
      expectedRowVersion: rowVersionSchema,
    }).parse(input).expectedRowVersion;
    return portalRouteSuccess(
      await removeFundingCallThumbnail(
        user,
        idSchema.parse(params.id),
        expectedRowVersion,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
