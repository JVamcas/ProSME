import "server-only";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import type { StreamingDocumentStorage } from "@/integrations/storage/StreamingDocumentStorage";
import { getReportRun } from "./ServerReportService";
import { findReportingPrincipal } from "./infrastructure/ReportPrincipalRepository";
import { requireReportSourceAccess } from "./application/ReportAccess";
import { reportingIdSchema } from "./api/ReportManagementSchemas";

export async function downloadReportArtifact(
  user: AuthenticatedUser | null,
  reportId: string,
  runId: string,
  artifactId: string,
  storage: StreamingDocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const caller = requirePermission(
    user,
    permissionCodes.reportingRunDownloadAll,
  );
  // Refresh grants even when a long-lived caller object was supplied by a trusted server operation.
  const current = await findReportingPrincipal(caller.id);
  requirePermission(current, permissionCodes.reportingRunDownloadAll);
  const detail = await getReportRun(current, reportId, runId);
  const artifact = detail.artifacts.find(
    (item) => item.id === reportingIdSchema.parse(artifactId),
  );
  if (!artifact) {
    throw new ResourceNotFoundError("artifact");
  }
  await requireReportSourceAccess(current, detail.run.definition);
  return { artifact, body: storage.readStream(artifact.objectKey) };
}
