import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { documentDownloadResponse } from "@/lib/api/DocumentDownloadResponse";
import { workflowStageFunnelQuerySchema } from "@/modules/workflows/api/WorkflowStageFunnelTypes";
import {
  exportWorkflowStageApplications,
  getWorkflowStageFunnel,
  listWorkflowStageApplications,
} from "@/modules/workflows/application/runtime/ServerWorkflowStageFunnelService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const applicationId = z.uuid().parse((await context.params).id);
    const query = new URL(request.url).searchParams;
    const download = z
      .enum(["csv"])
      .optional()
      .parse(query.get("download") ?? undefined);
    if (!query.has("stageKey") && !download) {
      return portalRouteSuccess(
        await getWorkflowStageFunnel(user, applicationId),
        correlationId,
      );
    }
    const input = workflowStageFunnelQuerySchema.parse({
      stageKey: query.get("stageKey"),
      page: query.get("page") ?? undefined,
      pageSize: query.get("pageSize") ?? undefined,
    });
    if (download) {
      return documentDownloadResponse(
        await exportWorkflowStageApplications(
          user,
          applicationId,
          input.stageKey,
          request.signal,
        ),
      );
    }
    return portalRouteSuccess(
      await listWorkflowStageApplications(user, applicationId, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
