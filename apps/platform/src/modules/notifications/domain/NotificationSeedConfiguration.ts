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
  {
    catalogKey: "WORKFLOW",
    description: "An information request was issued to an applicant.",
    displayName: "Information request created",
    id: "00000000-0000-4000-8000-000000000203",
    key: "workflow.information-request.created",
    recipientType: "APPLICATION_OWNER",
    ruleChannelId: "00000000-0000-4000-8000-000000000603",
    ruleId: "00000000-0000-4000-8000-000000000303",
    ruleRecipientId: "00000000-0000-4000-8000-000000000703",
  },
  {
    catalogKey: "WORKFLOW",
    description: "An applicant responded to an information request.",
    displayName: "Information request responded",
    id: "00000000-0000-4000-8000-000000000204",
    key: "workflow.information-request.responded",
    recipientType: "ASSIGNED_USER",
    ruleChannelId: "00000000-0000-4000-8000-000000000604",
    ruleId: "00000000-0000-4000-8000-000000000304",
    ruleRecipientId: "00000000-0000-4000-8000-000000000704",
  },
  {
    catalogKey: "WORKFLOW",
    description: "An information request was closed.",
    displayName: "Information request closed",
    id: "00000000-0000-4000-8000-000000000205",
    key: "workflow.information-request.closed",
    recipientType: "APPLICATION_OWNER",
    ruleChannelId: "00000000-0000-4000-8000-000000000605",
    ruleId: "00000000-0000-4000-8000-000000000305",
    ruleRecipientId: "00000000-0000-4000-8000-000000000705",
  },
  {
    catalogKey: "WORKFLOW",
    description: "An information request reached its response deadline.",
    displayName: "Information request expired",
    id: "00000000-0000-4000-8000-000000000206",
    key: "workflow.information-request.expired",
    recipientType: "ASSIGNED_USER",
    ruleChannelId: "00000000-0000-4000-8000-000000000606",
    ruleId: "00000000-0000-4000-8000-000000000306",
    ruleRecipientId: "00000000-0000-4000-8000-000000000706",
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
  defaultSubjectTemplate: string;
  eventKey?: NotificationEventKey;
  id: string;
  scope: NotificationTemplateScope;
};

export const notificationTemplateTargetSeeds: readonly NotificationTemplateTargetSeed[] =
  [
    {
      defaultSubjectTemplate: "Notification from {{platformName}}",
      id: "00000000-0000-4000-8000-000000000501",
      scope: "GLOBAL",
    },
    {
      catalogKey: "APPLICATIONS",
      defaultSubjectTemplate: "Application {{applicationReference}} update",
      id: "00000000-0000-4000-8000-000000000502",
      scope: "CATALOG",
    },
    {
      catalogKey: "WORKFLOW",
      defaultSubjectTemplate: "Workflow update for application {{applicationReference}}",
      id: "00000000-0000-4000-8000-000000000503",
      scope: "CATALOG",
    },
    {
      defaultSubjectTemplate: "Application {{applicationReference}} submitted",
      eventKey: "application.submitted",
      id: "00000000-0000-4000-8000-000000000504",
      scope: "EVENT",
    },
    {
      defaultSubjectTemplate: "New task assigned for application {{applicationReference}}",
      eventKey: "workflow.task.assigned",
      id: "00000000-0000-4000-8000-000000000505",
      scope: "EVENT",
    },
    {
      defaultSubjectTemplate: "Information requested for application {{applicationReference}}",
      eventKey: "workflow.information-request.created",
      id: "00000000-0000-4000-8000-000000000506",
      scope: "EVENT",
    },
    {
      defaultSubjectTemplate: "Applicant responded for application {{applicationReference}}",
      eventKey: "workflow.information-request.responded",
      id: "00000000-0000-4000-8000-000000000507",
      scope: "EVENT",
    },
    {
      defaultSubjectTemplate: "Information request closed for application {{applicationReference}}",
      eventKey: "workflow.information-request.closed",
      id: "00000000-0000-4000-8000-000000000508",
      scope: "EVENT",
    },
    {
      defaultSubjectTemplate: "Information request expired for application {{applicationReference}}",
      eventKey: "workflow.information-request.expired",
      id: "00000000-0000-4000-8000-000000000509",
      scope: "EVENT",
    },
  ];
