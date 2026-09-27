import path from "node:path";

import { RequestValidationError } from "@/lib/resource-errors";

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

export type WorkflowEvidenceRequirement = {
  acceptedFileTypes: ("PDF" | "JPG" | "PNG" | "DOCX")[];
  maximumSizeMb: number;
};

export function safeWorkflowEvidenceFileName(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 255);
}

export function validateWorkflowEvidenceFile(
  file: File,
  requirement: WorkflowEvidenceRequirement,
) {
  if (file.size === 0 || file.size > requirement.maximumSizeMb * 1024 * 1024) {
    throw new RequestValidationError(
      `Choose a non-empty file no larger than ${requirement.maximumSizeMb} MB.`,
    );
  }
  const extension = path.extname(file.name).toLowerCase() as
    keyof typeof allowedFiles;
  const allowed = allowedFiles[extension];
  if (
    !allowed
    || !requirement.acceptedFileTypes.includes(allowed.configuredType)
  ) {
    throw new RequestValidationError(
      `Choose one of these file types: ${requirement.acceptedFileTypes.join(", ")}.`,
    );
  }
  if (file.type && file.type !== allowed.contentType) {
    throw new RequestValidationError(
      "The file type does not match its extension.",
    );
  }
  return { ...allowed, extension };
}
