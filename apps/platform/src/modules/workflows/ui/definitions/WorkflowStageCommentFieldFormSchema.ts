import { z } from "zod";

export const workflowStageCommentFieldFormSchema = z.object({
  key: z.string().trim().min(2).max(80).regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Use uppercase letters, numbers and underscores.",
  ),
  taskStableKey: z.string().min(1, "Select a workflow task."),
  label: z.string().trim().min(2).max(160),
  helpText: z.string().trim().max(1000),
  mandatory: z.boolean(),
  displayOrder: z.number().int().positive(),
});

export type WorkflowStageCommentFieldFormValues = z.infer<
  typeof workflowStageCommentFieldFormSchema
>;
