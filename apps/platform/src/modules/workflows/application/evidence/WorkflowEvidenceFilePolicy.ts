import path from "node:path";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  documentMimeTypeMatches,
  formDocumentFileTypes,
  type FormDocumentExtension,
} from "@/modules/forms/domain/FormDocumentTypes";
import {
  workflowDocumentExtensions,
  type WorkflowDocumentFileType,
} from "../../domain/definitions/WorkflowStageDocumentRequirement";

export type WorkflowEvidenceRequirement = {
  acceptedFileTypes: WorkflowDocumentFileType[];
  maximumSizeMb: number;
  maxPages?: number | null;
  acceptedExtensions?: FormDocumentExtension[] | null;
};

export function safeWorkflowEvidenceFileName(name: string) {
  return path
    .basename(name)
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .slice(0, 255);
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
  const extension = path
    .extname(file.name)
    .toLowerCase() as FormDocumentExtension;
  const allowed = formDocumentFileTypes[extension];
  const extensions: readonly string[] =
    requirement.acceptedExtensions ??
    requirement.acceptedFileTypes.flatMap((type) => [
      ...workflowDocumentExtensions[type],
    ]);
  if (!allowed || !extensions.includes(extension)) {
    throw new RequestValidationError(
      `Choose one of these file types: ${requirement.acceptedFileTypes.join(", ")}.`,
    );
  }
  if (requirement.maxPages && extension !== ".pdf") {
    throw new RequestValidationError(
      "Choose a PDF so its page count can be checked.",
    );
  }
  if (!documentMimeTypeMatches(extension, file.type)) {
    throw new RequestValidationError(
      "The file type does not match its extension.",
    );
  }
  return { ...allowed, extension };
}
