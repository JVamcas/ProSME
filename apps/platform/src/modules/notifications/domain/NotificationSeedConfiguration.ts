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
  recipientType?: NotificationRecipientType;
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
  {
    catalogKey: "FUNDING_CALLS",
    description: "A funding call was submitted for governance approval.",
    displayName: "Funding call approval requested",
    id: "00000000-0000-4000-8000-000000000207",
    key: "funding-call.approval-requested",
    ruleChannelId: "00000000-0000-4000-8000-000000000607",
    ruleId: "00000000-0000-4000-8000-000000000307",
    ruleRecipientId: "00000000-0000-4000-8000-000000000707",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A funding call was returned for amendment.",
    displayName: "Funding call returned for amendment",
    id: "00000000-0000-4000-8000-000000000208",
    key: "funding-call.returned-for-amendment",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000608",
    ruleId: "00000000-0000-4000-8000-000000000308",
    ruleRecipientId: "00000000-0000-4000-8000-000000000708",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A funding call was approved.",
    displayName: "Funding call approved",
    id: "00000000-0000-4000-8000-000000000209",
    key: "funding-call.approved",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000609",
    ruleId: "00000000-0000-4000-8000-000000000309",
    ruleRecipientId: "00000000-0000-4000-8000-000000000709",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A pending funding call approval request was withdrawn.",
    displayName: "Funding call approval request withdrawn",
    id: "00000000-0000-4000-8000-000000000210",
    key: "funding-call.approval-request-withdrawn",
    ruleChannelId: "00000000-0000-4000-8000-000000000610",
    ruleId: "00000000-0000-4000-8000-000000000310",
    ruleRecipientId: "00000000-0000-4000-8000-000000000710",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "An approved funding call was published.",
    displayName: "Funding call published",
    id: "00000000-0000-4000-8000-000000000211",
    key: "funding-call.published",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000611",
    ruleId: "00000000-0000-4000-8000-000000000311",
    ruleRecipientId: "00000000-0000-4000-8000-000000000711",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A scheduled funding call became live.",
    displayName: "Funding call opened",
    id: "00000000-0000-4000-8000-000000000212",
    key: "funding-call.opened",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000612",
    ruleId: "00000000-0000-4000-8000-000000000312",
    ruleRecipientId: "00000000-0000-4000-8000-000000000712",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A funding call was suspended.",
    displayName: "Funding call suspended",
    id: "00000000-0000-4000-8000-000000000213",
    key: "funding-call.suspended",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000613",
    ruleId: "00000000-0000-4000-8000-000000000313",
    ruleRecipientId: "00000000-0000-4000-8000-000000000713",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A suspended funding call was resumed.",
    displayName: "Funding call resumed",
    id: "00000000-0000-4000-8000-000000000214",
    key: "funding-call.resumed",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000614",
    ruleId: "00000000-0000-4000-8000-000000000314",
    ruleRecipientId: "00000000-0000-4000-8000-000000000714",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A funding call reached its closing boundary.",
    displayName: "Funding call closed",
    id: "00000000-0000-4000-8000-000000000215",
    key: "funding-call.closed",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000615",
    ruleId: "00000000-0000-4000-8000-000000000315",
    ruleRecipientId: "00000000-0000-4000-8000-000000000715",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A published funding call was withdrawn.",
    displayName: "Funding call withdrawn",
    id: "00000000-0000-4000-8000-000000000216",
    key: "funding-call.withdrawn",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000616",
    ruleId: "00000000-0000-4000-8000-000000000316",
    ruleRecipientId: "00000000-0000-4000-8000-000000000716",
  },
  {
    catalogKey: "FUNDING_CALLS",
    description: "A closed or withdrawn funding call was archived.",
    displayName: "Funding call archived",
    id: "00000000-0000-4000-8000-000000000217",
    key: "funding-call.archived",
    recipientType: "FUNDING_CALL_STAKEHOLDER",
    ruleChannelId: "00000000-0000-4000-8000-000000000617",
    ruleId: "00000000-0000-4000-8000-000000000317",
    ruleRecipientId: "00000000-0000-4000-8000-000000000717",
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
  {
    description: "Funding call governance and publication lifecycle events.",
    displayName: "Funding calls",
    id: "00000000-0000-4000-8000-000000000403",
    key: "FUNDING_CALLS",
    sortOrder: 15,
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
    {
      catalogKey: "FUNDING_CALLS",
      defaultSubjectTemplate: "Funding call {{fundingCallReference}} update",
      id: "00000000-0000-4000-8000-000000000510",
      scope: "CATALOG",
    },
    ...notificationEventSeeds
      .filter((event) => event.catalogKey === "FUNDING_CALLS")
      .map((event, index) => ({
        defaultSubjectTemplate:
          `{{fundingCallReference}}: ${event.displayName}`,
        eventKey: event.key,
        id: `00000000-0000-4000-8000-${String(511 + index).padStart(12, "0")}`,
        scope: "EVENT" as const,
      })),
  ];
