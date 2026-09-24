import { z } from "zod";

import {
  workflowChecklistEvidenceRequirements,
  workflowChecklistResponseTypes,
} from "@/modules/workflows/domain/definitions/WorkflowStageChecklistDefinition";

export const checklistResponseTypeItems = [
  { label: "Yes / no", value: "YES_NO" },
  { label: "Text", value: "TEXT" },
  { label: "Number", value: "NUMBER" },
  { label: "Date", value: "DATE" },
] as const;

export const checklistEvidenceRequirementItems = [
  { label: "No evidence", value: "NONE" },
  { label: "Optional evidence", value: "OPTIONAL" },
  { label: "Required evidence", value: "REQUIRED" },
] as const;

export const workflowStageChecklistFormSchema = z.object({
  taskStableKey: z.string().min(1, "Select a workflow task."),
  key: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Use uppercase letters, numbers and underscores.",
    ),
  text: z.string().trim().min(2).max(500),
  mandatory: z.boolean(),
  responseType: z.enum(workflowChecklistResponseTypes),
  evidenceRequirement: z.enum(workflowChecklistEvidenceRequirements),
  notes: z.string().trim().max(1000),
  displayOrder: z.number().int().positive(),
});

export type WorkflowStageChecklistFormValues = z.infer<
  typeof workflowStageChecklistFormSchema
>;
