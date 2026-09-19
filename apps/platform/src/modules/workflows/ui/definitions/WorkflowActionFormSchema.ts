import { z } from "zod";

import { workflowActionTypes } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";

export const workflowActionFormSchema = z.object({
  stableKey: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Use uppercase letters, numbers and underscores.",
    ),
  label: z.string().trim().min(2).max(160),
  actionType: z.enum(workflowActionTypes),
  enabled: z.boolean(),
  reasonCodeRequired: z.boolean(),
  displayOrder: z.number().int().positive(),
});

export type WorkflowActionFormValues = z.infer<
  typeof workflowActionFormSchema
>;

export const workflowActionTypeItems = [
  { label: "Approve / Advance", value: "APPROVE_ADVANCE" },
  { label: "Reject", value: "REJECT" },
  { label: "Request Information", value: "REQUEST_INFORMATION" },
  { label: "Return", value: "RETURN" },
  { label: "Refer", value: "REFER" },
  { label: "Escalate", value: "ESCALATE" },
  { label: "Put on Hold", value: "PUT_ON_HOLD" },
  { label: "Withdraw", value: "WITHDRAW" },
  { label: "Defer", value: "DEFER" },
] as const;
