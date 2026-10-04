import "server-only";

import { randomUUID } from "node:crypto";

import { requireAuthenticatedUser, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import {
  gcsObjectPathSegments,
  resolveGcsObjectPath,
} from "@/integrations/storage/GcsObjectPath";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import { RequestValidationError, ResourceNotFoundError } from "@/lib/resource-errors";
import {
  safeWorkflowEvidenceFileName,
  validateWorkflowEvidenceFile,
} from "@/modules/workflows/application/evidence/WorkflowEvidenceFilePolicy";
import {
  createDocumentEvidenceVersion,
  findDocumentEvidenceVersion,
} from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceRepository";
import { getReadableWorkflowTask } from "@/modules/workflows/application/runtime/ServerWorkflowTaskReadService";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { getWorkflowTask } from "./ServerWorkflowTaskService";

async function editableTask(user: AuthenticatedUser | null, taskId: string) {
  const actor = requireAuthenticatedUser(user);
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  requirePermission(actor, task.permissions.edit);
  if (task.processingStatus === "ON_HOLD") {
    throw new RequestValidationError("Resume the applicable holds before changing documents.");
  }
  if (task.taskStatus === "COMPLETED") {
    throw new RequestValidationError(
      "Documents cannot be changed after the task is completed.",
    );
  }
  return { actor, task };
}

export async function uploadWorkflowTaskDocument(
  user: AuthenticatedUser | null,
  taskId: string,
  requirementId: string,
  file: File,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const { actor, task } = await editableTask(user, taskId);
  const requirement = task.documentRequirements.find(
    (item) => item.id === requirementId,
  );
  if (!requirement) {
    throw new RequestValidationError(
      "The selected document requirement does not belong to this task.",
    );
  }
  if (requirement.uploader === "APPLICANT") {
    throw new RequestValidationError(
      "This document must be uploaded by the applicant.",
    );
  }
  const validated = validateWorkflowEvidenceFile(file, requirement);
  const objectKey = resolveGcsObjectPath(
    ...gcsObjectPathSegments.users,
    actor.id,
    "workflow-evidence",
    task.applicationId,
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
      applicationId: task.applicationId,
      taskId: task.taskInstanceId,
      contentType: validated.contentType,
      objectKey,
      originalName: safeWorkflowEvidenceFileName(file.name),
      requirementId,
      sizeBytes: file.size,
      uploadedBy: actor.id,
      validUntil: requirement.expiryDays === null
        ? null
        : new Date(Date.now() + requirement.expiryDays * 86_400_000),
    });
    if (!version) throw new ResourceNotFoundError("document requirement");
  } catch (error) {
    await storage.delete(objectKey).catch(() => undefined);
    throw error;
  }
  return getWorkflowTask(user, taskId);
}

export async function createWorkflowTaskDocumentDownload(
  user: AuthenticatedUser | null,
  taskId: string,
  versionId: string,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const { task } = await getReadableWorkflowTask(user, taskId);
  const requirement = task.documentRequirements.find(
    (item) => item.document?.versionId === versionId,
  );
  if (!requirement?.id) throw new ResourceNotFoundError("workflow document");
  const version = await findDocumentEvidenceVersion(task.applicationId, versionId);
  if (!version || version.requirementId !== requirement.id) {
    throw new ResourceNotFoundError("workflow document");
  }
  return {
    body: await storage.read(version.objectKey),
    contentType: version.contentType,
    fileName: version.originalName,
  };
}
