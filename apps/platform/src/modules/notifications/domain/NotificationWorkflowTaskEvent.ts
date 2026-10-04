import { z } from "zod";
import {
  applicationOwnerSnapshotSchema,
  identifierSchema,
  timestampSchema,
  uuidSchema,
} from "./NotificationEventSchemaFields";

const assignedTaskSchema = z
  .object({
    assignedUserId: uuidSchema,
    taskId: uuidSchema,
    taskName: z.string().trim().min(1).max(300),
  })
  .strict();

export const workflowTaskAssignedContextSchema = z
  .object({
    applicationId: uuidSchema,
    applicationReference: z.string().trim().min(1).max(100),
    assignedAt: timestampSchema,
    assignees: z.array(applicationOwnerSnapshotSchema).min(1),
    correlationId: identifierSchema,
    fundingOpportunityTitle: z.string().trim().min(1).max(300),
    sourceIdempotencyKey: identifierSchema,
    stageInstanceId: uuidSchema,
    stageName: z.string().trim().min(1).max(300),
    tasks: z.array(assignedTaskSchema).min(1),
    workflowInstanceId: uuidSchema,
  })
  .strict()
  .superRefine((context, issueContext) => {
    const assigneeIds = new Set(
      context.assignees.map((assignee) => assignee.userId),
    );
    for (const [index, task] of context.tasks.entries()) {
      if (!assigneeIds.has(task.assignedUserId)) {
        issueContext.addIssue({
          code: "custom",
          message: "Task assignee must have a matching assignee snapshot.",
          path: ["tasks", index, "assignedUserId"],
        });
      }
    }
  });

export const workflowTaskEscalatedContextSchema = workflowTaskAssignedContextSchema.safeExtend({
  escalationId: uuidSchema,
  reason: z.string().trim().max(4_000).nullable(),
  trigger: z.enum(["MANUAL", "SLA_BREACH", "CONDITION", "RFI_EXPIRY"]),
});

