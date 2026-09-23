import "server-only";

import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import { gcsObjectPrefixes } from "@/integrations/storage/GcsObjectPrefixes";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import {
  RequestValidationError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { getAttachedApplicationForm } from "../infrastructure/AttachedApplicationFormRepository";
import {
  applicationDocumentRequirementKeySchema,
  applicationDocumentVersionIdSchema,
  type ApplicationDocumentRegister,
} from "../api/ApplicationDocumentSchemas";
import {
  applicationDocumentAllowedFiles,
  applicationDocumentMaximumBytes,
  applicationDocumentRequirements,
} from "../domain/ApplicationDocumentPolicy";
import {
  safeApplicationDocumentName,
  validApplicationDocumentSignature,
} from "./ApplicationDocumentValidation";
import {
  createPendingApplicationDocumentVersion,
  failApplicationDocumentVersion,
  finalizeApplicationDocumentVersion,
  findOwnedDownloadableApplicationDocumentVersion,
  listAbandonedApplicationDocumentObjects,
  listLatestOwnedApplicationDocumentVersions,
  markApplicationDocumentVersionAbandoned,
  setApplicationDocumentSecurityResult,
} from "../infrastructure/ApplicationDocumentRepository";
import { findOwnedApplication } from "../infrastructure/ApplicationRepository";
import { readOwnedApplicationDraftResponse } from "../infrastructure/ApplicationResponseRepository";

export class InvalidApplicationDocumentError extends RequestValidationError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidApplicationDocumentError";
  }
}

async function loadDocumentContext(
  ownerUserId: string,
  applicationId: string,
  requireDraft: boolean,
) {
  const application = await findOwnedApplication(ownerUserId, applicationId);
  if (
    !application
    || requireDraft && application.status !== "draft"
    || !application.formVersionId
  ) {
    throw new ResourceNotFoundError("application draft");
  }
  const [form, response] = await Promise.all([
    getAttachedApplicationForm(
      application.formVersionId,
      application.fundingOpportunityId,
    ),
    readOwnedApplicationDraftResponse(ownerUserId, applicationId),
  ]);
  if (
    !form
    || !response
    || response.formVersionId !== application.formVersionId
  ) {
    throw new ResourceNotFoundError("application configuration");
  }
  return {
    application,
    requirements: applicationDocumentRequirements(form, response.values),
  };
}

async function documentRegister(
  ownerUserId: string,
  applicationId: string,
  requireDraft: boolean,
): Promise<ApplicationDocumentRegister> {
  const context = await loadDocumentContext(
    ownerUserId,
    applicationId,
    requireDraft,
  );
  const documents = await listLatestOwnedApplicationDocumentVersions(
    ownerUserId,
    applicationId,
  );
  const visibleKeys = new Set(context.requirements.map((item) => item.key));
  return {
    documents: documents.filter((item) => visibleKeys.has(item.requirementKey)),
    requirements: context.requirements,
  };
}

function validateFile(file: File) {
  if (file.size === 0 || file.size > applicationDocumentMaximumBytes) {
    throw new InvalidApplicationDocumentError(
      "Choose a non-empty file no larger than 10 MB.",
    );
  }
  const extension = path.extname(file.name).toLowerCase() as
    keyof typeof applicationDocumentAllowedFiles;
  const allowed = applicationDocumentAllowedFiles[extension];
  if (!allowed) {
    throw new InvalidApplicationDocumentError(
      "Choose a PDF, JPEG, PNG, or DOCX file.",
    );
  }
  if (file.type && file.type !== allowed.contentType) {
    throw new InvalidApplicationDocumentError(
      "The file type does not match its extension.",
    );
  }
  return { ...allowed, extension };
}

export async function getOwnApplicationDocuments(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationDocumentOwnRead,
  );
  return documentRegister(actor.id, applicationId, false);
}

export async function uploadOwnApplicationDocument(
  user: AuthenticatedUser | null,
  applicationId: string,
  requirementKeyInput: string,
  file: File,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationDocumentOwnUpload,
  );
  const requirementKey = applicationDocumentRequirementKeySchema.parse(
    requirementKeyInput,
  );
  const context = await loadDocumentContext(actor.id, applicationId, true);
  if (!context.requirements.some((item) => item.key === requirementKey)) {
    throw new InvalidApplicationDocumentError(
      "The selected document requirement is not available for this application.",
    );
  }
  const validated = validateFile(file);
  const body = Buffer.from(await file.arrayBuffer());
  if (!validApplicationDocumentSignature(body, validated.signature)) {
    throw new InvalidApplicationDocumentError(
      "The file content does not match its selected type.",
    );
  }
  const objectKey = [
    gcsObjectPrefixes.users,
    actor.id,
    applicationId,
    requirementKey,
    `${randomUUID()}${validated.extension}`,
  ].join("/");
  const version = await createPendingApplicationDocumentVersion({
    applicationId,
    checksumSha256: createHash("sha256").update(body).digest("hex"),
    contentType: validated.contentType,
    extension: validated.extension,
    objectKey,
    originalName: safeApplicationDocumentName(file.name),
    ownerUserId: actor.id,
    requirementKey,
    sizeBytes: file.size,
  });
  if (!version) throw new ResourceNotFoundError("application draft");
  try {
    await storage.put({
      body,
      contentType: validated.contentType,
      objectKey,
    });
    if (!await finalizeApplicationDocumentVersion(version.id)) {
      throw new Error("Document finalization state changed unexpectedly.");
    }
  } catch (error) {
    await failApplicationDocumentVersion(version.id, "STORAGE_FINALIZATION_FAILED");
    await storage.delete(objectKey).catch(() => undefined);
    throw error;
  }
  return documentRegister(actor.id, applicationId, true);
}

export async function createOwnApplicationDocumentDownload(
  user: AuthenticatedUser | null,
  applicationId: string,
  versionIdInput: string,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationDocumentOwnRead,
  );
  const versionId = applicationDocumentVersionIdSchema.parse(versionIdInput);
  const version = await findOwnedDownloadableApplicationDocumentVersion(
    actor.id,
    applicationId,
    versionId,
  );
  if (!version) throw new ResourceNotFoundError("application document");
  return storage.createSignedDownloadUrl({
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    fileName: version.originalName,
    objectKey: version.objectKey,
  });
}

export async function cleanupAbandonedApplicationDocumentUploads(
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
  now = new Date(),
) {
  const before = new Date(now.getTime() - 60 * 60 * 1000);
  const candidates = await listAbandonedApplicationDocumentObjects(before);
  let cleaned = 0;
  for (const candidate of candidates) {
    try {
      await storage.delete(candidate.objectKey);
      await markApplicationDocumentVersionAbandoned(candidate.versionId);
      cleaned += 1;
    } catch {
      // The next bounded background run retries this observable failure.
    }
  }
  return { cleaned, inspected: candidates.length };
}

export async function recordApplicationDocumentSecurityResult(
  versionIdInput: string,
  result: "clean" | "rejected",
) {
  const versionId = applicationDocumentVersionIdSchema.parse(versionIdInput);
  return setApplicationDocumentSecurityResult(versionId, result);
}
