import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { documentDownloadResponse } from "@/lib/api/DocumentDownloadResponse";
import { adminApplicationExportSchema } from "@/modules/applications/api/AdminApplicationSchemas";
import { exportAdminApplications } from "@/modules/applications/ServerAdminApplicationExportService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = adminApplicationExportSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return documentDownloadResponse(
      await exportAdminApplications(user, input, request.signal),
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
