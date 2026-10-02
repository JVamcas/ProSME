import type {
  NotificationEventSeed,
  NotificationTemplateTargetSeed,
} from "./NotificationSeedConfiguration";

export const workflowDeadlineTemplateSeeds = [
  {
    defaultSubjectTemplate: "Review overdue for application {{applicationReference}}",
    eventKey: "workflow.sla.breached",
    id: "00000000-0000-4000-8000-000000000526",
    scope: "EVENT",
  },
  {
    defaultSubjectTemplate: "Reminder: information needed for application {{applicationReference}}",
    eventKey: "workflow.information-request.reminder",
    id: "00000000-0000-4000-8000-000000000527",
    scope: "EVENT",
  },
  {
    defaultSubjectTemplate: "Time to review application {{applicationReference}} on hold",
    eventKey: "workflow.hold.review-due",
    id: "00000000-0000-4000-8000-000000000528",
    scope: "EVENT",
  },
  {
    defaultSubjectTemplate: "Review resumed for application {{applicationReference}}",
    eventKey: "workflow.deferral.resumed",
    id: "00000000-0000-4000-8000-000000000529",
    scope: "EVENT",
  },
] as const satisfies readonly NotificationTemplateTargetSeed[];

export const workflowDeadlineEventSeeds: readonly NotificationEventSeed[] = [
  {
    catalogKey: "WORKFLOW",
    description: "A workflow task exceeded its effective SLA deadline.",
    displayName: "Workflow SLA breached",
    id: "00000000-0000-4000-8000-000000000221",
    key: "workflow.sla.breached",
    ruleChannelId: "00000000-0000-4000-8000-000000000621",
    ruleId: "00000000-0000-4000-8000-000000000321",
    ruleRecipientId: "00000000-0000-4000-8000-000000000721",
  },
  {
    catalogKey: "WORKFLOW",
    description: "An open information request reached a configured reminder day.",
    displayName: "Information request reminder",
    id: "00000000-0000-4000-8000-000000000222",
    key: "workflow.information-request.reminder",
    ruleChannelId: "00000000-0000-4000-8000-000000000622",
    ruleId: "00000000-0000-4000-8000-000000000322",
    ruleRecipientId: "00000000-0000-4000-8000-000000000722",
  },
  {
    catalogKey: "WORKFLOW",
    description: "A held stage reached its review date; the hold remains active.",
    displayName: "Workflow hold review due",
    id: "00000000-0000-4000-8000-000000000223",
    key: "workflow.hold.review-due",
    ruleChannelId: "00000000-0000-4000-8000-000000000623",
    ruleId: "00000000-0000-4000-8000-000000000323",
    ruleRecipientId: "00000000-0000-4000-8000-000000000723",
  },
  {
    catalogKey: "WORKFLOW",
    description: "A date-based deferral resumed its workflow stage.",
    displayName: "Workflow deferral resumed",
    id: "00000000-0000-4000-8000-000000000224",
    key: "workflow.deferral.resumed",
    ruleChannelId: "00000000-0000-4000-8000-000000000624",
    ruleId: "00000000-0000-4000-8000-000000000324",
    ruleRecipientId: "00000000-0000-4000-8000-000000000724",
  },
];
