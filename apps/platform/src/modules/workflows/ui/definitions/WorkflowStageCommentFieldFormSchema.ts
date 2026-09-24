import { z } from "zod";

import { workflowCommentFieldVisibilities } from "@/modules/workflows/domain/definitions/WorkflowStageCommentField";

export const commentFieldVisibilityItems = [
  { label: "Applicant visible", value: "APPLICANT_VISIBLE" },
  { label: "Internal only", value: "INTERNAL_ONLY" },
] as const;

export const workflowStageCommentFieldFormSchema = z.object({
  key: z.string().trim().min(2).max(80).regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Use uppercase letters, numbers and underscores.",
  ),
  label: z.string().trim().min(2).max(160),
  helpText: z.string().trim().max(1000),
  mandatory: z.boolean(),
  visibility: z.enum(workflowCommentFieldVisibilities),
  displayOrder: z.number().int().positive(),
});

export type WorkflowStageCommentFieldFormValues = z.infer<
  typeof workflowStageCommentFieldFormSchema
>;
