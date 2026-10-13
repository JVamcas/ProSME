import type { FormField } from "@/modules/forms/FormTypes";
import { documentFieldConfiguration } from "@/modules/forms/domain/FormDocumentConfiguration";
import type { WorkflowDocumentFileType } from "./WorkflowStageDocumentRequirement";

export function formDocumentRequirement(
  field: Pick<
    FormField,
    | "key"
    | "label"
    | "required"
    | "uploadedBy"
    | "acceptedExtensions"
    | "maximumFileSizeMb"
    | "maxPages"
    | "workflowDocument"
  >,
) {
  const settings = documentFieldConfiguration(field);
  const legacy = field.uploadedBy === undefined ? field.workflowDocument : null;
  return {
    stableKey: field.workflowDocument?.stableKey ?? field.key,
    name: field.label,
    mandatory: field.required,
    acceptedFileTypes: settings.acceptedExtensions.map(
      (extension) =>
        extension.slice(1).toUpperCase() as WorkflowDocumentFileType,
    ),
    acceptedExtensions:
      field.uploadedBy !== undefined || field.acceptedExtensions
        ? settings.acceptedExtensions
        : undefined,
    maximumSizeMb: settings.maximumFileSizeMb,
    maxPages: settings.maxPages,
    uploader: legacy?.uploader ?? settings.uploadedBy,
    expiryDays: legacy?.expiryDays ?? null,
    requestOnStageActivation: legacy?.requestOnStageActivation ?? false,
    verifier: legacy?.verifier ?? ("ASSIGNED_REVIEWER" as const),
    templateReference: legacy?.templateReference ?? "",
  };
}
