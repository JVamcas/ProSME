import { z } from "zod";

import {
  workflowDocumentFileTypes,
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

export function parseOptionalExpiryDays(value: string | number | null | undefined) {
  return value == null || value === "" ? null : Number(value);
}

export const workflowStageDocumentRequirementFormSchema = z.object({
  stableKey: z.string()
    .trim()
    .min(2, "Stable key is required.")
    .max(80)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Use uppercase letters, numbers, and underscores, starting with a letter.",
    ),
  name: z.string().trim().min(2).max(160),
  taskStableKey: z.string().min(1, "Select a workflow task."),
  mandatory: z.boolean(),
  acceptedFileTypes: z.array(z.enum(workflowDocumentFileTypes))
    .min(1, "Select at least one accepted file type."),
  maximumSizeMb: z.number().int().min(1).max(100),
  expiryDays: z.number().int().min(1).max(3650).nullable(),
  requestOnStageActivation: z.boolean(),
  templateReference: z.string().trim().max(500),
});

export type WorkflowStageDocumentRequirementFormValues = z.infer<
  typeof workflowStageDocumentRequirementFormSchema
>;
