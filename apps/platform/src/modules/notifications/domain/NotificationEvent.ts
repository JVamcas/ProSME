import { z } from "zod";

import {
  notificationErrorCodes,
  NotificationValidationError,
} from "./NotificationErrors";

const uuidSchema = z.uuid();
const snapshotNameSchema = z.string().trim().min(1).max(200);
const snapshotEmailSchema = z.email().max(320);
const identifierSchema = z.string().trim().min(1).max(500);
const timestampSchema = z.iso.datetime({ offset: true });

const applicationOwnerSnapshotSchema = z.object({
  displayName: snapshotNameSchema,
  email: snapshotEmailSchema,
  userId: uuidSchema,
}).strict();

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

const assigneeSnapshotSchema = applicationOwnerSnapshotSchema;

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

const informationRequestContextSchema = z.object({
  applicationId: uuidSchema,
  applicationReference: z.string().trim().min(1).max(100),
  assignees: z.array(assigneeSnapshotSchema),
  correlationId: identifierSchema,
  fundingOpportunityTitle: z.string().trim().min(1).max(300),
  owner: applicationOwnerSnapshotSchema,
  question: z.string().trim().min(1).max(2_000),
  requestInformationId: uuidSchema,
  sourceIdempotencyKey: identifierSchema,
  workflowInstanceId: uuidSchema,
});

export const informationRequestCreatedContextSchema = informationRequestContextSchema
  .extend({
    createdAt: timestampSchema,
    deadlineAt: timestampSchema,
  })
  .strict();

export const informationRequestRespondedContextSchema = informationRequestContextSchema
  .extend({
    respondedAt: timestampSchema,
  })
  .strict();

export const informationRequestClosedContextSchema = informationRequestContextSchema
  .extend({
    closedAt: timestampSchema,
  })
  .strict();

export const informationRequestExpiredContextSchema = informationRequestContextSchema
  .extend({
    deadlineAt: timestampSchema,
    expiredAt: timestampSchema,
  })
  .strict();

export const notificationEventKeys = [
  "application.submitted",
  "workflow.information-request.created",
  "workflow.information-request.responded",
  "workflow.information-request.closed",
  "workflow.information-request.expired",
  "workflow.task.assigned",
] as const;

export type NotificationEventKey = (typeof notificationEventKeys)[number];
export const notificationCatalogKeys = ["APPLICATIONS", "WORKFLOW"] as const;
export type NotificationCatalogKey = (typeof notificationCatalogKeys)[number];
export type ApplicationSubmittedContext = z.infer<
  typeof applicationSubmittedContextSchema
>;
export type WorkflowTaskAssignedContext = z.infer<
  typeof workflowTaskAssignedContextSchema
>;
export type InformationRequestCreatedContext = z.infer<
  typeof informationRequestCreatedContextSchema
>;
export type InformationRequestRespondedContext = z.infer<
  typeof informationRequestRespondedContextSchema
>;
export type InformationRequestClosedContext = z.infer<
  typeof informationRequestClosedContextSchema
>;
export type InformationRequestExpiredContext = z.infer<
  typeof informationRequestExpiredContextSchema
>;

export type NotificationEventContextByKey = {
  "application.submitted": ApplicationSubmittedContext;
  "workflow.information-request.closed": InformationRequestClosedContext;
  "workflow.information-request.created": InformationRequestCreatedContext;
  "workflow.information-request.expired": InformationRequestExpiredContext;
  "workflow.information-request.responded": InformationRequestRespondedContext;
  "workflow.task.assigned": WorkflowTaskAssignedContext;
};

type NotificationEventDefinition<Key extends NotificationEventKey> = {
  catalogKey: NotificationCatalogKey;
  contextSchema: z.ZodType<NotificationEventContextByKey[Key]>;
  key: Key;
};

export const notificationEventCatalogue = {
  "application.submitted": {
    catalogKey: "APPLICATIONS",
    contextSchema: applicationSubmittedContextSchema,
    key: "application.submitted",
  },
  "workflow.information-request.closed": {
    catalogKey: "WORKFLOW",
    contextSchema: informationRequestClosedContextSchema,
    key: "workflow.information-request.closed",
  },
  "workflow.information-request.created": {
    catalogKey: "WORKFLOW",
    contextSchema: informationRequestCreatedContextSchema,
    key: "workflow.information-request.created",
  },
  "workflow.information-request.expired": {
    catalogKey: "WORKFLOW",
    contextSchema: informationRequestExpiredContextSchema,
    key: "workflow.information-request.expired",
  },
  "workflow.information-request.responded": {
    catalogKey: "WORKFLOW",
    contextSchema: informationRequestRespondedContextSchema,
    key: "workflow.information-request.responded",
  },
  "workflow.task.assigned": {
    catalogKey: "WORKFLOW",
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
