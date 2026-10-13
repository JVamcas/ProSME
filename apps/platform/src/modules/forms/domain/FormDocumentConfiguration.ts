import type { FormField } from "../FormTypes";
import {
  defaultFormDocumentExtensions,
  type FormDocumentExtension,
} from "./FormDocumentTypes";

export const documentUploaders = [
  "APPLICANT",
  "ANY",
  "ASSIGNED_REVIEWER",
] as const;
export type DocumentUploader = (typeof documentUploaders)[number];

export function documentFieldConfiguration(
  field: Pick<
    FormField,
    | "acceptedExtensions"
    | "maximumFileSizeMb"
    | "maxPages"
    | "uploadedBy"
    | "workflowDocument"
  >,
) {
  const legacy = field.workflowDocument;
  const uploadedBy =
    field.uploadedBy ??
    (legacy?.uploader === "STAFF" ? "ANY" : (legacy?.uploader ?? "APPLICANT"));
  const legacyLimits = field.uploadedBy === undefined ? legacy : null;
  const acceptedExtensions: FormDocumentExtension[] = field.maxPages
    ? [".pdf"]
    : (field.acceptedExtensions ??
      legacyLimits?.acceptedFileTypes.flatMap((type) =>
        type === "JPG"
          ? [".jpg", ".jpeg"]
          : [`.${type.toLowerCase()}` as FormDocumentExtension],
      ) ??
      defaultFormDocumentExtensions);
  return {
    uploadedBy,
    acceptedExtensions,
    maximumFileSizeMb:
      field.maximumFileSizeMb ?? legacyLimits?.maximumSizeMb ?? 10,
    maxPages: field.maxPages,
  };
}
