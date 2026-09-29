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

const applicationOwnerSnapshotSchema = z
  .object({
    displayName: snapshotNameSchema,
    email: snapshotEmailSchema,
    userId: uuidSchema,
  })
  .strict();

export const applicationSubmittedContextSchema = z
  .object({
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
  })
  .strict();

const assignedTaskSchema = z
  .object({
    assignedUserId: uuidSchema,
    taskId: uuidSchema,
    taskName: z.string().trim().min(1).max(300),
  })
  .strict();

const assigneeSnapshotSchema = applicationOwnerSnapshotSchema;

export const workflowTaskAssignedContextSchema = z
  .object({
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

export const informationRequestCreatedContextSchema =
  informationRequestContextSchema
    .extend({
      createdAt: timestampSchema,
      deadlineAt: timestampSchema,
    })
    .strict();

export const informationRequestRespondedContextSchema =
  informationRequestContextSchema
    .extend({
      respondedAt: timestampSchema,
    })
    .strict();

export const informationRequestClosedContextSchema =
  informationRequestContextSchema
    .extend({
      closedAt: timestampSchema,
    })
    .strict();

export const informationRequestExpiredContextSchema =
  informationRequestContextSchema
    .extend({
      deadlineAt: timestampSchema,
      expiredAt: timestampSchema,
    })
    .strict();

export const fundingCallLifecycleContextSchema = z
  .object({
    correlationId: identifierSchema,
    excludedRecipientUserIds: z.array(uuidSchema),
    fundingCallId: uuidSchema,
    fundingCallReference: z.string().trim().min(1).max(100),
    fundingCallTitle: z.string().trim().min(1).max(300),
    occurredAt: timestampSchema,
    reason: z.string().trim().min(1).max(1_000).nullable(),
    sourceIdempotencyKey: identifierSchema,
    sourceStatus: z.string().trim().min(1).max(50),
    targetStatus: z.string().trim().min(1).max(50),
  })
  .strict();

export const authenticationEventContextSchema = z
  .object({
    firebaseUid: z.string().min(1).max(128),
    recipientEmail: snapshotEmailSchema,
  })
  .strict();

export type AuthenticationEventKey =
  "auth.email.verification" | "auth.password.reset";
export type NotificationRuleEligibility = "CONFIGURABLE" | "SYSTEM_ONLY";

export const notificationEventKeys = [
  "auth.email.verification",
  "auth.password.reset",
  "application.submitted",
  "funding-call.approval-request-withdrawn",
  "funding-call.approval-requested",
  "funding-call.approved",
  "funding-call.archived",
  "funding-call.closed",
  "funding-call.opened",
  "funding-call.published",
  "funding-call.resumed",
  "funding-call.returned-for-amendment",
  "funding-call.suspended",
  "funding-call.withdrawn",
  "workflow.information-request.created",
  "workflow.information-request.responded",
  "workflow.information-request.closed",
  "workflow.information-request.expired",
  "workflow.task.assigned",
] as const;

export type NotificationEventKey = (typeof notificationEventKeys)[number];
export const notificationCatalogKeys = [
  "AUTHENTICATION",
  "APPLICATIONS",
  "FUNDING_CALLS",
  "WORKFLOW",
] as const;
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
export type FundingCallLifecycleContext = z.infer<
  typeof fundingCallLifecycleContextSchema
>;

export type NotificationEventContextByKey = {
  "auth.email.verification": z.infer<typeof authenticationEventContextSchema>;
  "auth.password.reset": z.infer<typeof authenticationEventContextSchema>;
  "application.submitted": ApplicationSubmittedContext;
  "funding-call.approval-request-withdrawn": FundingCallLifecycleContext;
  "funding-call.approval-requested": FundingCallLifecycleContext;
  "funding-call.approved": FundingCallLifecycleContext;
  "funding-call.archived": FundingCallLifecycleContext;
  "funding-call.closed": FundingCallLifecycleContext;
  "funding-call.opened": FundingCallLifecycleContext;
  "funding-call.published": FundingCallLifecycleContext;
  "funding-call.resumed": FundingCallLifecycleContext;
  "funding-call.returned-for-amendment": FundingCallLifecycleContext;
  "funding-call.suspended": FundingCallLifecycleContext;
  "funding-call.withdrawn": FundingCallLifecycleContext;
  "workflow.information-request.closed": InformationRequestClosedContext;
  "workflow.information-request.created": InformationRequestCreatedContext;
  "workflow.information-request.expired": InformationRequestExpiredContext;
  "workflow.information-request.responded": InformationRequestRespondedContext;
  "workflow.task.assigned": WorkflowTaskAssignedContext;
};

type NotificationEventDefinition<Key extends NotificationEventKey> = {
  ruleEligibility: NotificationRuleEligibility;
  catalogKey: NotificationCatalogKey;
  contextSchema: z.ZodType<NotificationEventContextByKey[Key]>;
  key: Key;
};

export const notificationEventCatalogue = {
  "auth.email.verification": {
    ruleEligibility: "SYSTEM_ONLY",
    catalogKey: "AUTHENTICATION",
    contextSchema: authenticationEventContextSchema,
    key: "auth.email.verification",
  },
  "auth.password.reset": {
    ruleEligibility: "SYSTEM_ONLY",
    catalogKey: "AUTHENTICATION",
    contextSchema: authenticationEventContextSchema,
    key: "auth.password.reset",
  },
  "application.submitted": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "APPLICATIONS",
    contextSchema: applicationSubmittedContextSchema,
    key: "application.submitted",
  },
  "funding-call.approval-request-withdrawn": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.approval-request-withdrawn",
  },
  "funding-call.approval-requested": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.approval-requested",
  },
  "funding-call.approved": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.approved",
  },
  "funding-call.archived": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.archived",
  },
  "funding-call.closed": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.closed",
  },
  "funding-call.opened": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.opened",
  },
  "funding-call.published": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.published",
  },
  "funding-call.resumed": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.resumed",
  },
  "funding-call.returned-for-amendment": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.returned-for-amendment",
  },
  "funding-call.suspended": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.suspended",
  },
  "funding-call.withdrawn": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "FUNDING_CALLS",
    contextSchema: fundingCallLifecycleContextSchema,
    key: "funding-call.withdrawn",
  },
  "workflow.information-request.closed": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "WORKFLOW",
    contextSchema: informationRequestClosedContextSchema,
    key: "workflow.information-request.closed",
  },
  "workflow.information-request.created": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "WORKFLOW",
    contextSchema: informationRequestCreatedContextSchema,
    key: "workflow.information-request.created",
  },
  "workflow.information-request.expired": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "WORKFLOW",
    contextSchema: informationRequestExpiredContextSchema,
    key: "workflow.information-request.expired",
  },
  "workflow.information-request.responded": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "WORKFLOW",
    contextSchema: informationRequestRespondedContextSchema,
    key: "workflow.information-request.responded",
  },
  "workflow.task.assigned": {
    ruleEligibility: "CONFIGURABLE",
    catalogKey: "WORKFLOW",
    contextSchema: workflowTaskAssignedContextSchema,
    key: "workflow.task.assigned",
  },
} as const satisfies {
  [Key in NotificationEventKey]: NotificationEventDefinition<Key>;
};

export function isNotificationEventKey(
  value: string,
): value is NotificationEventKey {
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

  const result =
    notificationEventCatalogue[eventKey].contextSchema.safeParse(context);
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
