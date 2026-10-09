import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createCorrelationId,
  portalRouteSuccess,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { reportListSchema } from "./ReportManagementSchemas";
import { RequestValidationError } from "@/lib/resource-errors";

export async function reportRoute<T>(
  request: Request,
  operation: (user: AuthenticatedUser | null) => Promise<T>,
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(await operation(user), correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
export function reportListInput(request: Request) {
  return reportListSchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
}

export async function reportBodyInput<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new RequestValidationError(
      "The request body must contain valid JSON.",
    );
  }
}
