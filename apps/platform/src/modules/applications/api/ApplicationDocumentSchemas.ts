import { z } from "zod";

export const applicationDocumentRequirementKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const applicationDocumentVersionIdSchema = z.uuid();

export const applicationDocumentUploadSchema = z.object({
  requirementKey: applicationDocumentRequirementKeySchema,
  file: z.custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    { error: "Choose a file to upload." },
  ),
});

export type ApplicationDocumentRequirement = {
  acceptedExtensions: string[];
  key: string;
  label: string;
  maximumBytes: number;
  maximumFiles: 1;
  required: boolean;
  sectionKey: string;
  sectionTitle: string;
};

export type ApplicationDocumentView = {
  contentType: string;
  fileName: string;
  requirementKey: string;
  scanStatus: "pending" | "clean" | "rejected";
  sizeBytes: number;
  storageStatus: "pending" | "finalized" | "failed" | "abandoned";
  uploadedAt: string;
  versionId: string;
  versionNumber: number;
};

export type ApplicationDocumentRegister = {
  documents: ApplicationDocumentView[];
  requirements: ApplicationDocumentRequirement[];
};
