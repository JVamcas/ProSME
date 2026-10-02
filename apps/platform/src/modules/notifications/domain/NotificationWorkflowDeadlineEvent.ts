import { z } from "zod";
import { workflowDeadlineKinds } from "@/modules/workflows/domain/runtime/WorkflowDeadline";
import {
  applicationOwnerSnapshotSchema,
  identifierSchema,
  timestampSchema,
  uuidSchema,
} from "./NotificationEventSchemaFields";

export const workflowDeadlineContextSchema = z.object({
  applicationId: uuidSchema,
  applicationReference: z.string().trim().min(1).max(100),
  assignees: z.array(applicationOwnerSnapshotSchema),
  correlationId: identifierSchema,
  deadlineAt: timestampSchema.nullable(),
  fundingOpportunityTitle: z.string().trim().min(1).max(300),
  kind: z.enum(workflowDeadlineKinds),
  occurredAt: timestampSchema,
  owner: applicationOwnerSnapshotSchema,
  question: z.string().trim().min(1).max(2_000).nullable(),
  scheduledFor: timestampSchema,
  sourceIdempotencyKey: identifierSchema,
  sourceId: uuidSchema,
  stageInstanceId: uuidSchema,
  stageName: z.string().trim().min(1).max(300),
  workflowInstanceId: uuidSchema,
}).strict();

export const workflowDeadlineNotificationFields = [
  "brandingLogoUrl", "platformName", "recipientName", "applicationReference",
  "fundingOpportunityTitle", "stageName", "scheduledFor", "occurredAt",
  "kind", "workQueueUrl", "applicationUrl", "informationRequestUrl", "deadlineAt", "question",
] as const;

function deadlineEvent<Key extends string>(key: Key) {
  return {
    ruleEligibility: "CONFIGURABLE" as const,
    catalogKey: "WORKFLOW" as const,
    contextSchema: workflowDeadlineContextSchema,
    key,
  };
}

export const workflowDeadlineEventCatalogue = {
  "workflow.sla.breached": deadlineEvent("workflow.sla.breached"),
  "workflow.information-request.reminder": deadlineEvent("workflow.information-request.reminder"),
  "workflow.hold.review-due": deadlineEvent("workflow.hold.review-due"),
  "workflow.deferral.resumed": deadlineEvent("workflow.deferral.resumed"),
};
