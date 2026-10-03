import "server-only";

import { randomUUID } from "node:crypto";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import {
  gcsObjectPathSegments,
  resolveGcsObjectPath,
} from "@/integrations/storage/GcsObjectPath";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import {
  RequestValidationError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  safeWorkflowEvidenceFileName,
  validateWorkflowEvidenceFile,
} from "../evidence/WorkflowEvidenceFilePolicy";
import {
  createDocumentEvidenceVersion,
  findDocumentEvidenceVersion,
} from "../../infrastructure/WorkflowDocumentEvidenceRepository";
import { getOwnedWorkflowRfi } from "./ServerWorkflowRfiReadService";

export async function uploadOwnedWorkflowRfiDocument(
  user: AuthenticatedUser | null,
  applicationId: string,
  requestInformationId: string,
  requirementId: string,
  file: File,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationInformationRequestOwnRespond,
  );
  const rfi = await getOwnedWorkflowRfi(
    actor,
    applicationId,
    requestInformationId,
  );
  if (rfi.status !== "OPEN" || new Date(rfi.deadlineAt) <= new Date()) {
    throw new RequestValidationError(
      "Documents cannot be changed after submission or the response deadline.",
    );
  }
  const requirement = rfi.requestedDocuments.find(
    (item) => item.requirementId === requirementId,
  );
  if (!requirement) {
    throw new RequestValidationError(
      "The selected document was not requested.",
    );
  }
  const validated = validateWorkflowEvidenceFile(file, requirement);
  const objectKey = resolveGcsObjectPath(
    ...gcsObjectPathSegments.users,
    actor.id,
    "workflow-evidence",
    applicationId,
    requirementId,
    `${randomUUID()}${validated.extension}`,
  );
  await storage.put({
    body: Buffer.from(await file.arrayBuffer()),
    contentType: validated.contentType,
    objectKey,
  });
  try {
    const version = await createDocumentEvidenceVersion({
      applicationId,
      taskId: rfi.taskId,
      contentType: validated.contentType,
      objectKey,
      originalName: safeWorkflowEvidenceFileName(file.name),
      requirementId,
      sizeBytes: file.size,
      uploadedBy: actor.id,
      validUntil: null,
    });
    if (!version) throw new ResourceNotFoundError("document requirement");
  } catch (error) {
    await storage.delete(objectKey).catch(() => undefined);
    throw error;
  }
  return getOwnedWorkflowRfi(actor, applicationId, requestInformationId);
}

export async function createOwnedWorkflowRfiDocumentDownload(
  user: AuthenticatedUser | null,
  applicationId: string,
  requestInformationId: string,
  versionId: string,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationInformationRequestOwnRead,
  );
  const rfi = await getOwnedWorkflowRfi(
    actor,
    applicationId,
    requestInformationId,
  );
  const requested = rfi.requestedDocuments.find(
    (item) => item.evidence?.versionId === versionId,
  );
  if (!requested) throw new ResourceNotFoundError("RFI document");
  const version = await findDocumentEvidenceVersion(applicationId, versionId);
  if (!version || version.requirementId !== requested.requirementId) {
    throw new ResourceNotFoundError("RFI document");
  }
  return {
    body: await storage.read(version.objectKey),
    contentType: version.contentType,
    fileName: version.originalName,
  };
}
