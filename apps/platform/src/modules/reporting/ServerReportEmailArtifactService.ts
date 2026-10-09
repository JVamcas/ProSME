import "server-only";
import { createHash } from "node:crypto";
import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import type { StreamingDocumentStorage } from "@/integrations/storage/StreamingDocumentStorage";
import type { NotificationEmailMessage } from "@/modules/notifications/application/NotificationEmailSender";
import { findReportingPrincipal } from "./infrastructure/ReportPrincipalRepository";
import { getReportRun } from "./ServerReportService";
import type {
  ReportingEventContext,
  ReportingEventKey,
} from "@/modules/notifications/domain/NotificationReportingEvent";

export const reportEmailAttachmentLimit = 18 * 1024 * 1024;
export class ReportEmailArtifactError extends Error {}

export async function loadReportEmailArtifact(
  userId: string,
  context: ReportingEventContext,
  key: ReportingEventKey,
  storage: StreamingDocumentStorage = new GoogleCloudDocumentStorage(),
): Promise<NonNullable<NotificationEmailMessage["attachments"]>> {
  const actor = await findReportingPrincipal(userId);
  const detail = await getReportRun(actor, context.reportId, context.runId);
  if (key === "reporting.generation.started") {
    if (context.artifactId)
      throw new ReportEmailArtifactError("Started events cannot carry files.");
    return [];
  }
  requirePermission(actor, permissionCodes.reportingRunDownloadAll);
  const kind = key === "reporting.generation.completed" ? "OUTPUT" : "ERROR";
  const expectedStatus = kind === "OUTPUT" ? "SUCCEEDED" : "FAILED";
  const artifact = detail.artifacts.find(
    (item) => item.id === context.artifactId && item.kind === kind,
  );
  if (
    !artifact ||
    detail.run.status !== expectedStatus ||
    artifact.bytes > reportEmailAttachmentLimit
  ) {
    throw new ReportEmailArtifactError(
      "The saved attachment is missing or exceeds the 18 MiB email limit.",
    );
  }
  const body = storage.readStream(artifact.objectKey);
  const timeout = setTimeout(
    () =>
      body.destroy(new ReportEmailArtifactError("Attachment read timed out.")),
    15000,
  );
  const parts: Buffer[] = [];
  let bytes = 0;
  const checksum = createHash("sha256");
  try {
    for await (const chunk of body) {
      const part = Buffer.from(chunk);
      bytes += part.length;
      if (bytes > reportEmailAttachmentLimit)
        throw new ReportEmailArtifactError(
          "Attachment exceeds the email limit.",
        );
      checksum.update(part);
      parts.push(part);
    }
    if (
      bytes !== artifact.bytes ||
      checksum.digest("hex") !== artifact.checksum
    ) {
      throw new ReportEmailArtifactError("Attachment integrity check failed.");
    }
    return [
      {
        content: Buffer.concat(parts),
        contentType: artifact.contentType,
        filename: artifact.filename,
      },
    ];
  } finally {
    clearTimeout(timeout);
    body.destroy();
  }
}
