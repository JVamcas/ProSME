import type { NotificationEventKey } from "./NotificationEvent";
import type { NotificationRecipientType } from "./NotificationRecipient";

export const emailNotificationChannelSeed = {
  channelType: "EMAIL" as const,
  code: "EMAIL",
  displayName: "Email",
  id: "00000000-0000-4000-8000-000000000101",
  isEnabled: true,
};

export type NotificationEventSeed = {
  description: string;
  displayName: string;
  id: string;
  key: NotificationEventKey;
  recipientType: NotificationRecipientType;
  ruleId: string;
};

export const notificationEventSeeds: readonly NotificationEventSeed[] = [
  {
    description: "An applicant submitted a funding application.",
    displayName: "Application submitted",
    id: "00000000-0000-4000-8000-000000000201",
    key: "application.submitted",
    recipientType: "APPLICATION_OWNER",
    ruleId: "00000000-0000-4000-8000-000000000301",
  },
  {
    description: "Workflow tasks were assigned to one or more users.",
    displayName: "Workflow task assigned",
    id: "00000000-0000-4000-8000-000000000202",
    key: "workflow.task.assigned",
    recipientType: "ASSIGNED_USER",
    ruleId: "00000000-0000-4000-8000-000000000302",
  },
];

