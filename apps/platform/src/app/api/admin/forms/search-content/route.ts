import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getTaskFormSearchContent } from "@/modules/forms/application/ServerFormConfigurationService";

const schema = z.object({ versionIds: z.array(z.string().uuid()).max(500) });
export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = schema.parse(await request.json());
    return portalRouteSuccess(
      await getTaskFormSearchContent(user, input.versionIds),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
