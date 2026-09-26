import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";

import { requireAuthenticatedUser, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import { gcsObjectPrefixes } from "@/integrations/storage/GcsObjectPrefixes";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import { RequestValidationError, ResourceNotFoundError } from "@/lib/resource-errors";
import {
  createDocumentEvidenceVersion,
  findDocumentEvidenceVersion,
} from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceRepository";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import type { DocumentRequirementItem } from "./TaskTypes";
import { getWorkflowTask } from "./ServerWorkflowTaskService";

const allowedFiles = {
  ".docx": {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    configuredType: "DOCX",
  },
  ".jpeg": { contentType: "image/jpeg", configuredType: "JPG" },
  ".jpg": { contentType: "image/jpeg", configuredType: "JPG" },
  ".pdf": { contentType: "application/pdf", configuredType: "PDF" },
  ".png": { contentType: "image/png", configuredType: "PNG" },
} as const;

function safeFileName(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 255);
}

function validateFile(file: File, requirement: DocumentRequirementItem) {
  if (file.size === 0 || file.size > requirement.maximumSizeMb * 1024 * 1024) {
    throw new RequestValidationError(
      `Choose a non-empty file no larger than ${requirement.maximumSizeMb} MB.`,
    );
  }
  const extension = path.extname(file.name).toLowerCase() as keyof typeof allowedFiles;
  const allowed = allowedFiles[extension];
  if (!allowed || !requirement.acceptedFileTypes.includes(allowed.configuredType)) {
    throw new RequestValidationError(
      `Choose one of these file types: ${requirement.acceptedFileTypes.join(", ")}.`,
    );
  }
  if (file.type && file.type !== allowed.contentType) {
    throw new RequestValidationError("The file type does not match its extension.");
  }
  return { ...allowed, extension };
}

async function editableTask(user: AuthenticatedUser | null, taskId: string) {
  const actor = requireAuthenticatedUser(user);
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  requirePermission(actor, task.permissions.edit);
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
  const validated = validateFile(file, requirement);
  const objectKey = [
    gcsObjectPrefixes.users,
    actor.id,
    "workflow-evidence",
    task.applicationId,
    requirementId,
    `${randomUUID()}${validated.extension}`,
  ].join("/");
  await storage.put({
    body: Buffer.from(await file.arrayBuffer()),
    contentType: validated.contentType,
    objectKey,
  });
  try {
    const version = await createDocumentEvidenceVersion({
      applicationId: task.applicationId,
      contentType: validated.contentType,
      objectKey,
      originalName: safeFileName(file.name),
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
  const actor = requireAuthenticatedUser(user);
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  requirePermission(actor, task.permissions.view);
  const requirement = task.documentRequirements.find(
    (item) => item.document?.versionId === versionId,
  );
  if (!requirement?.id) throw new ResourceNotFoundError("workflow document");
  const version = await findDocumentEvidenceVersion(task.applicationId, versionId);
  if (!version || version.requirementId !== requirement.id) {
    throw new ResourceNotFoundError("workflow document");
  }
  return storage.createSignedDownloadUrl({
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    fileName: version.originalName,
    objectKey: version.objectKey,
  });
}
