import { z } from "zod";
import { workflowHoldScopes } from "@/modules/workflows/domain/runtime/WorkflowHold";
import { applicationOwnerSnapshotSchema } from "./NotificationEventSchemaFields";
import {
  workflowDeadlineContextSchema,
  workflowDeadlineNotificationFields,
} from "./NotificationWorkflowDeadlineEvent";

export const workflowHoldResumedContextSchema = workflowDeadlineContextSchema
  .extend({
    holder: applicationOwnerSnapshotSchema,
    scope: z.enum(workflowHoldScopes),
    processingStillHeld: z.boolean(),
  })
  .strict();

export const workflowHoldResumedNotificationFields = [
  ...workflowDeadlineNotificationFields,
  "holdScope",
  "resumptionStatus",
] as const;

export const workflowHoldResumedEventSeed = {
  catalogKey: "WORKFLOW",
  description:
    "A hold reached its review date and ended automatically; notify the person who placed it.",
  displayName: "Workflow hold automatically resumed",
  id: "00000000-0000-4000-8000-000000000226",
  key: "workflow.hold.resumed",
  recipientType: "ACTION_ACTOR",
  ruleChannelId: "00000000-0000-4000-8000-000000000626",
  ruleId: "00000000-0000-4000-8000-000000000326",
  ruleRecipientId: "00000000-0000-4000-8000-000000000726",
} as const;

export const workflowHoldResumedTemplateSeed = {
  defaultSubjectTemplate:
    "Your hold ended for application {{applicationReference}}",
  eventKey: "workflow.hold.resumed",
  id: "00000000-0000-4000-8000-000000000531",
  scope: "EVENT",
} as const;
