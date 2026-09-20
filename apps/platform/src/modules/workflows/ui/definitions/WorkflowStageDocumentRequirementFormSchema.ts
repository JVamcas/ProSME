import { z } from "zod";

import {
  workflowDocumentActors,
  workflowDocumentFileTypes,
  workflowDocumentVerifierActors,
} from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";

export const documentFileTypeItems = [
  { label: "PDF", value: "PDF" },
  { label: "JPG / JPEG", value: "JPG" },
  { label: "PNG", value: "PNG" },
  { label: "DOCX", value: "DOCX" },
] as const;

export const documentActorItems = [
  { label: "Applicant", value: "APPLICANT" },
  { label: "Assigned reviewer", value: "ASSIGNED_REVIEWER" },
  { label: "Staff", value: "STAFF" },
] as const;

export const documentVerifierItems = documentActorItems.filter(
  (item) => item.value !== "APPLICANT",
);

export const workflowStageDocumentRequirementFormSchema = z.object({
  name: z.string().trim().min(2).max(160),
  mandatory: z.boolean(),
  acceptedFileTypes: z.array(z.enum(workflowDocumentFileTypes))
    .min(1, "Select at least one accepted file type."),
  maximumSizeMb: z.number().int().min(1).max(100),
  expiryDays: z.number().int().min(1).max(3650).nullable(),
  uploader: z.enum(workflowDocumentActors),
  verifier: z.enum(workflowDocumentVerifierActors),
  templateReference: z.string().trim().max(500),
});

export type WorkflowStageDocumentRequirementFormValues = z.infer<
  typeof workflowStageDocumentRequirementFormSchema
>;
