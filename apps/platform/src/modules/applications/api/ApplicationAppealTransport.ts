import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { RequestValidationError } from "@/lib/resource-errors";

export async function appealRoute<T>(
  request: Request,
  operation: (user: AuthenticatedUser | null) => Promise<T>,
) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await operation(await resolveUserFromHeaders(request.headers)),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
export async function readAppealBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader)
    throw new RequestValidationError("A JSON request body is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 100_000) {
        await reader.cancel();
        throw new RequestValidationError(
          "The request is too large. Shorten the appeal and try again.",
        );
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof RequestValidationError) throw error;
    throw new RequestValidationError("The request must contain valid JSON.");
  } finally {
    reader.releaseLock();
  }
}
