import { Readable } from "node:stream";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { downloadReportArtifact } from "@/modules/reporting/ServerReportArtifactService";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: {
    params: Promise<{ reportId: string; runId: string; artifactId: string }>;
  },
) {
  const correlationId = createCorrelationId();
  try {
    const { reportId, runId, artifactId } = await context.params;
    const user = await resolveUserFromHeaders(request.headers);
    const { artifact, body } = await downloadReportArtifact(
      user,
      reportId,
      runId,
      artifactId,
    );
    return new Response(Readable.toWeb(body) as ReadableStream<Uint8Array>, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": artifact.contentType,
        "Content-Length": String(artifact.bytes),
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
        "X-Content-Type-Options": "nosniff",
        "X-Correlation-Id": correlationId,
      },
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
