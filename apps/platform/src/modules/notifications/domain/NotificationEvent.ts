import { z } from "zod";

import {
  notificationErrorCodes,
  NotificationValidationError,
} from "./NotificationErrors";
import type { NotificationRecipientType } from "./NotificationRecipient";

const uuidSchema = z.uuid();
const snapshotNameSchema = z.string().trim().min(1).max(200);
const snapshotEmailSchema = z.email().max(320);
const identifierSchema = z.string().trim().min(1).max(500);
const timestampSchema = z.iso.datetime({ offset: true });

export const applicationSubmittedContextSchema = z.object({
  applicationId: uuidSchema,
  applicationOwnerUserId: uuidSchema,
  applicationReference: z.string().trim().min(1).max(100),
  correlationId: identifierSchema,
  fundingOpportunityTitle: z.string().trim().min(1).max(300),
  ownerDisplayName: snapshotNameSchema,
  ownerEmail: snapshotEmailSchema,
  sourceIdempotencyKey: identifierSchema,
  submittedAt: timestampSchema,
  workflowInstanceId: uuidSchema,
}).strict();

const assignedTaskSchema = z.object({
  assignedUserId: uuidSchema,
  taskId: uuidSchema,
  taskName: z.string().trim().min(1).max(300),
}).strict();

const assigneeSnapshotSchema = z.object({
  displayName: snapshotNameSchema,
  email: snapshotEmailSchema,
  userId: uuidSchema,
}).strict();

export const workflowTaskAssignedContextSchema = z.object({
  applicationId: uuidSchema,
  applicationReference: z.string().trim().min(1).max(100),
  assignedAt: timestampSchema,
  assignees: z.array(assigneeSnapshotSchema).min(1),
  correlationId: identifierSchema,
  fundingOpportunityTitle: z.string().trim().min(1).max(300),
  sourceIdempotencyKey: identifierSchema,
  stageInstanceId: uuidSchema,
  stageName: z.string().trim().min(1).max(300),
  tasks: z.array(assignedTaskSchema).min(1),
  workflowInstanceId: uuidSchema,
}).strict().superRefine((context, issueContext) => {
  const assigneeIds = new Set(context.assignees.map((assignee) => assignee.userId));
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

export const notificationEventKeys = [
  "application.submitted",
  "workflow.task.assigned",
] as const;

export type NotificationEventKey = (typeof notificationEventKeys)[number];
export type ApplicationSubmittedContext = z.infer<
  typeof applicationSubmittedContextSchema
>;
export type WorkflowTaskAssignedContext = z.infer<
  typeof workflowTaskAssignedContextSchema
>;

export type NotificationEventContextByKey = {
  "application.submitted": ApplicationSubmittedContext;
  "workflow.task.assigned": WorkflowTaskAssignedContext;
};

type NotificationEventDefinition<Key extends NotificationEventKey> = {
  allowedRecipientTypes: readonly NotificationRecipientType[];
  contextSchema: z.ZodType<NotificationEventContextByKey[Key]>;
  key: Key;
};

export const notificationEventCatalogue = {
  "application.submitted": {
    allowedRecipientTypes: ["APPLICATION_OWNER"],
    contextSchema: applicationSubmittedContextSchema,
    key: "application.submitted",
  },
  "workflow.task.assigned": {
    allowedRecipientTypes: ["ASSIGNED_USER"],
    contextSchema: workflowTaskAssignedContextSchema,
    key: "workflow.task.assigned",
  },
} as const satisfies {
  [Key in NotificationEventKey]: NotificationEventDefinition<Key>;
};

export function isNotificationEventKey(value: string): value is NotificationEventKey {
  return value in notificationEventCatalogue;
}

export function parseNotificationContext<Key extends NotificationEventKey>(
  eventKey: Key,
  context: unknown,
): NotificationEventContextByKey[Key];
export function parseNotificationContext(
  eventKey: string,
  context: unknown,
): NotificationEventContextByKey[NotificationEventKey];
export function parseNotificationContext(eventKey: string, context: unknown) {
  if (!isNotificationEventKey(eventKey)) {
    throw new NotificationValidationError(
      notificationErrorCodes.unknownEvent,
      `Unknown notification event: ${eventKey}`,
    );
  }

  const result = notificationEventCatalogue[eventKey].contextSchema.safeParse(context);
  if (!result.success) {
    throw new NotificationValidationError(
      notificationErrorCodes.invalidContext,
      `Invalid context for notification event: ${eventKey}`,
      result.error.issues.map((issue) => ({
        message: issue.message,
        path: issue.path.join("."),
      })),
    );
  }
  return result.data;
}

export function assertRecipientCompatibility(
  eventKey: string,
  recipientType: NotificationRecipientType,
): void {
  if (!isNotificationEventKey(eventKey)) {
    throw new NotificationValidationError(
      notificationErrorCodes.unknownEvent,
      `Unknown notification event: ${eventKey}`,
    );
  }
  if (!notificationEventCatalogue[eventKey].allowedRecipientTypes.includes(
    recipientType as never,
  )) {
    throw new NotificationValidationError(
      notificationErrorCodes.incompatibleRecipient,
      `${recipientType} is not compatible with ${eventKey}`,
    );
  }
}

