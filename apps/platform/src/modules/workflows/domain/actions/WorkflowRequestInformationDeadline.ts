import { z } from "zod";

export const workflowRfiDeadlineFields = {
  deadlineDays: z.number().int().positive().max(365),
  expiryAction: z.enum(["CLOSE_REQUEST", "ESCALATE", "RETURN"]),
  reminderDayOffsets: z.array(z.number().int().positive().max(365)).max(20),
};

export const workflowRfiRuntimeOverridesSchema = z
  .object({
    deadlineDays: z.boolean(),
    expiryAction: z.boolean(),
    reminderDayOffsets: z.boolean(),
  })
  .strict();

export type WorkflowRfiRuntimeOverrides = z.infer<
  typeof workflowRfiRuntimeOverridesSchema
>;

export const workflowRfiDeadlineOverrideSchema = z
  .object({
    deadlineDays: workflowRfiDeadlineFields.deadlineDays.optional(),
    expiryAction: z.literal("CLOSE_REQUEST").optional(),
    reminderDayOffsets: workflowRfiDeadlineFields.reminderDayOffsets.optional(),
  })
  .strict();

export function validateWorkflowRfiReminderDeadline(
  settings: { deadlineDays: number; reminderDayOffsets: number[] },
  context: z.RefinementCtx,
) {
  if (
    new Set(settings.reminderDayOffsets).size !==
    settings.reminderDayOffsets.length
  ) {
    context.addIssue({
      code: "custom",
      message: "Reminder day offsets must be unique.",
      path: ["reminderDayOffsets"],
    });
  }
  if (
    settings.reminderDayOffsets.some(
      (offset) => offset >= settings.deadlineDays,
    )
  ) {
    context.addIssue({
      code: "custom",
      message: "Reminder days must fall before the deadline.",
      path: ["reminderDayOffsets"],
    });
  }
}

export const workflowRfiDeadlineSettingsSchema = z
  .object(workflowRfiDeadlineFields)
  .strict()
  .superRefine(validateWorkflowRfiReminderDeadline);

export type WorkflowRfiDeadlineSettings = z.infer<
  typeof workflowRfiDeadlineSettingsSchema
>;

export type WorkflowRfiDeadlineConfiguration = WorkflowRfiDeadlineSettings & {
  runtimeOverrides?: WorkflowRfiRuntimeOverrides;
};

export function parseWorkflowRfiReminderOffsets(value: string) {
  if (!value.trim()) return [];
  return value.split(/[\n,]/).map((item) => Number(item.trim()));
}

export function resolveWorkflowRfiDeadline(
  configuration: WorkflowRfiDeadlineConfiguration,
  overrides: z.infer<typeof workflowRfiDeadlineOverrideSchema> = {},
):
  | { success: true; data: WorkflowRfiDeadlineSettings }
  | { success: false; issues: z.core.$ZodIssue[] } {
  const parsed = workflowRfiDeadlineOverrideSchema.safeParse(overrides);
  if (!parsed.success) return { success: false, issues: parsed.error.issues };

  const labels = {
    deadlineDays: "Response deadline",
    expiryAction: "On expiry",
    reminderDayOffsets: "Reminder day offsets",
  };
  for (const key of Object.keys(
    labels,
  ) as (keyof WorkflowRfiRuntimeOverrides)[]) {
    if (
      parsed.data[key] !== undefined &&
      !configuration.runtimeOverrides?.[key]
    ) {
      return {
        success: false,
        issues: [
          {
            code: "custom",
            message: `${labels[key]} cannot be overridden for this action.`,
            path: [key],
          },
        ],
      };
    }
  }
  const effective = workflowRfiDeadlineSettingsSchema.safeParse({
    deadlineDays: parsed.data.deadlineDays ?? configuration.deadlineDays,
    expiryAction: parsed.data.expiryAction ?? configuration.expiryAction,
    reminderDayOffsets:
      parsed.data.reminderDayOffsets ?? configuration.reminderDayOffsets,
  });
  return effective.success
    ? { success: true, data: effective.data }
    : { success: false, issues: effective.error.issues };
}
