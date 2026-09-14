import { z } from "zod";

const conditions = {
  ALL_REQUIRED_TASKS_COMPLETE: z.object({
    type: z.literal("ALL_REQUIRED_TASKS_COMPLETE"),
  }),
  TASK_RESULT_EQUALS: z.object({
    type: z.literal("TASK_RESULT_EQUALS"),
    taskCode: z.string().min(1),
    field: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
} as const;

export const workflowConditionSchema = z.union([
  conditions.ALL_REQUIRED_TASKS_COMPLETE,
  conditions.TASK_RESULT_EQUALS,
]);

export function listConditionRegistryEntries() {
  return Object.keys(conditions);
}

export function validateWorkflowCondition(value: unknown) {
  return workflowConditionSchema.safeParse(value);
}
