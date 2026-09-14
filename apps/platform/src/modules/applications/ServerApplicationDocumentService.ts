import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";

import { capabilities } from "@/auth/authorization/capabilities";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  listOwnedApplicationDocuments,
  replaceOwnedApplicationDocument,
} from "@/db/repositories/ApplicationDocumentRepository";
import { findOwnedApplication } from "@/db/repositories/ApplicationRepository";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import { gcsObjectPrefixes } from "@/integrations/storage/GcsObjectPrefixes";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import {
  RequestValidationError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  applicationDocumentTypeSchema,
  type ApplicationDocumentType,
} from "./ApplicationDocumentSchemas";

const maximumBytes = 10 * 1024 * 1024;
const allowedFiles = {
  ".docx": {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    signature: "zip",
  },
  ".jpeg": { contentType: "image/jpeg", signature: "jpeg" },
  ".jpg": { contentType: "image/jpeg", signature: "jpeg" },
  ".pdf": { contentType: "application/pdf", signature: "pdf" },
  ".png": { contentType: "image/png", signature: "png" },
} as const;

export class InvalidApplicationDocumentError extends RequestValidationError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidApplicationDocumentError";
  }
}

function validSignature(body: Buffer, signature: string) {
  if (signature === "pdf") return body.subarray(0, 5).toString() === "%PDF-";
  if (signature === "png") {
    return body
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (signature === "jpeg") return body[0] === 0xff && body[1] === 0xd8;
  return body[0] === 0x50 && body[1] === 0x4b;
}

function validateFile(file: File, documentType: ApplicationDocumentType) {
  if (file.size === 0 || file.size > maximumBytes) {
    throw new InvalidApplicationDocumentError(
      "Choose a file between 1 byte and 10 MB.",
    );
  }
  const extension = path
    .extname(file.name)
    .toLowerCase() as keyof typeof allowedFiles;
  const allowed = allowedFiles[extension];
  const invalidProposalType = documentType === "project-proposal"
    && extension === ".png";
  const invalidDocxType = extension === ".docx"
    && documentType !== "project-proposal";
  if (!allowed || invalidProposalType || invalidDocxType) {
    throw new InvalidApplicationDocumentError(
      "Choose a supported PDF, JPG, PNG, or proposal DOCX file.",
    );
  }
  if (file.type && file.type !== allowed.contentType) {
    throw new InvalidApplicationDocumentError(
      "The file type does not match its extension.",
    );
  }
  return {
    contentType: allowed.contentType,
    extension,
    signature: allowed.signature,
  };
}

async function requireOwnedDraft(ownerUserId: string, applicationId: string) {
  const application = await findOwnedApplication(ownerUserId, applicationId);
  if (!application || application.status !== "draft") {
    throw new ResourceNotFoundError("application draft");
  }
}

export async function getOwnApplicationDocuments(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requireCapability(user, capabilities.documentReadOwn);
  await requireOwnedDraft(actor.id, applicationId);
  return listOwnedApplicationDocuments(actor.id, applicationId);
}

export async function uploadOwnApplicationDocument(
  user: AuthenticatedUser | null,
  applicationId: string,
  documentTypeInput: string,
  file: File,
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requireCapability(user, capabilities.documentUploadOwn);
  const documentType = applicationDocumentTypeSchema.parse(documentTypeInput);
  await requireOwnedDraft(actor.id, applicationId);
  const validated = validateFile(file, documentType);
  const body = Buffer.from(await file.arrayBuffer());
  if (!validSignature(body, validated.signature)) {
    throw new InvalidApplicationDocumentError(
      "The file content does not match the selected file type.",
    );
  }
  const objectKey = [
    gcsObjectPrefixes.users,
    actor.id,
    applicationId,
    documentType,
    `${randomUUID()}${validated.extension}`,
  ].join("/");
  await storage.put({ body, contentType: validated.contentType, objectKey });
  try {
    const previousKey = await replaceOwnedApplicationDocument({
      applicationId,
      contentType: validated.contentType,
      documentType,
      objectKey,
      originalName: path.basename(file.name),
      ownerUserId: actor.id,
      sizeBytes: file.size,
    });
    if (previousKey === undefined) {
      throw new ResourceNotFoundError("application draft");
    }
    if (previousKey) await storage.delete(previousKey).catch(() => undefined);
  } catch (error) {
    await storage.delete(objectKey).catch(() => undefined);
    throw error;
  }
  return listOwnedApplicationDocuments(actor.id, applicationId);
}
