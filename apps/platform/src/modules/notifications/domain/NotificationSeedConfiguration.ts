import type { NotificationEventKey } from "./NotificationEvent";
import type { NotificationCatalogKey } from "./NotificationEvent";
import type { NotificationRecipientType } from "./NotificationRecipient";
import type { NotificationTemplateScope } from "./NotificationTemplate";

export const emailNotificationChannelSeed = {
  channelType: "EMAIL" as const,
  code: "EMAIL",
  displayName: "Email",
  id: "00000000-0000-4000-8000-000000000101",
  isEnabled: true,
  sortOrder: 10,
};

export type NotificationEventSeed = {
  catalogKey: NotificationCatalogKey;
  description: string;
  displayName: string;
  id: string;
  key: NotificationEventKey;
  recipientType: NotificationRecipientType;
  ruleChannelId: string;
  ruleId: string;
  ruleRecipientId: string;
};

export const notificationEventSeeds: readonly NotificationEventSeed[] = [
  {
    catalogKey: "APPLICATIONS",
    description: "An applicant submitted a funding application.",
    displayName: "Application submitted",
    id: "00000000-0000-4000-8000-000000000201",
    key: "application.submitted",
    recipientType: "APPLICATION_OWNER",
    ruleChannelId: "00000000-0000-4000-8000-000000000601",
    ruleId: "00000000-0000-4000-8000-000000000301",
    ruleRecipientId: "00000000-0000-4000-8000-000000000701",
  },
  {
    catalogKey: "WORKFLOW",
    description: "Workflow tasks were assigned to one or more users.",
    displayName: "Workflow task assigned",
    id: "00000000-0000-4000-8000-000000000202",
    key: "workflow.task.assigned",
    recipientType: "ASSIGNED_USER",
    ruleChannelId: "00000000-0000-4000-8000-000000000602",
    ruleId: "00000000-0000-4000-8000-000000000302",
    ruleRecipientId: "00000000-0000-4000-8000-000000000702",
  },
];

export type NotificationCatalogSeed = {
  description: string;
  displayName: string;
  id: string;
  key: NotificationCatalogKey;
  sortOrder: number;
};

export const notificationCatalogSeeds: readonly NotificationCatalogSeed[] = [
  {
    description: "Funding application lifecycle notification events.",
    displayName: "Applications",
    id: "00000000-0000-4000-8000-000000000401",
    key: "APPLICATIONS",
    sortOrder: 10,
  },
  {
    description: "Workflow runtime notification events.",
    displayName: "Workflow",
    id: "00000000-0000-4000-8000-000000000402",
    key: "WORKFLOW",
    sortOrder: 20,
  },
];

export type NotificationTemplateTargetSeed = {
  catalogKey?: NotificationCatalogKey;
  eventKey?: NotificationEventKey;
  id: string;
  scope: NotificationTemplateScope;
};

export const notificationTemplateTargetSeeds: readonly NotificationTemplateTargetSeed[] =
  [
    {
      id: "00000000-0000-4000-8000-000000000501",
      scope: "GLOBAL",
    },
    {
      catalogKey: "APPLICATIONS",
      id: "00000000-0000-4000-8000-000000000502",
      scope: "CATALOG",
    },
    {
      catalogKey: "WORKFLOW",
      id: "00000000-0000-4000-8000-000000000503",
      scope: "CATALOG",
    },
    {
      eventKey: "application.submitted",
      id: "00000000-0000-4000-8000-000000000504",
      scope: "EVENT",
    },
    {
      eventKey: "workflow.task.assigned",
      id: "00000000-0000-4000-8000-000000000505",
      scope: "EVENT",
    },
  ];
